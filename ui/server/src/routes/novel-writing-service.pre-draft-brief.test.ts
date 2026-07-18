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

describe('chapter pre-draft brief', () => {
  test('adds restrained meme strategy to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        genre: '规则怪谈',
        reference_config: {
          meme_bank: [
            {
              meme_key: '社畜崩溃式吐槽',
              function: '用上班人共鸣化解高压后的半拍吐槽',
              tone: '轻度吐槽',
              suitable_genres: ['规则怪谈'],
              abstract_usage: '角色在确认危险后用短句吐槽制度感压迫，不复刻原梗。',
            },
          ],
        },
      },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          summary: '李超和张智在午夜校园醒来。',
          conflict: '必须判断规则是否可信。',
          ending_hook: '广播响起。',
          scene_cards: [{ title: '操场醒来', reader_payoff: '超人力量遇到规则反制。' }],
        },
      },
    )

    expect(brief.meme_strategy.intensity).toBe('轻度')
    expect(brief.meme_strategy.allowed_functions).toContain('用上班人共鸣化解高压后的半拍吐槽')
    expect(brief.meme_strategy.forbidden_usage).toContain('严肃死亡场景不玩梗')
  })

  test('carries governance recheck memory into single-chapter pre-draft brief and confirmed context', () => {
    const contextPackage = {
      governance_recheck_memory: {
        source_run_id: 44,
        status: 'closed',
        label: '治理复查已记录',
        summary: '恢复依据闭环 2/2，本章必须继续继承上一轮修后证据。',
        evidence: ['第42章对白交锋已补回样章节奏'],
        failed_evidence: [],
        watch_items: ['下一章继续观察样章策略命中率'],
        storyline_decision_task_count: 0,
      },
      chapter_target: {
        chapter_no: 43,
        title: '复查后的新局',
        summary: '主角用新证据逼对手公开应答。',
        conflict: '对手试图绕开上一轮修复后的对白交锋。',
        ending_hook: '旧账本出现第二个签名。',
        scene_cards: [{ title: '当堂应答', reader_payoff: '对白交锋压住旧臣。' }],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '万字长篇' }, contextPackage)

    expect(brief.governance_recheck_memory).toMatchObject({
      source_run_id: 44,
      status: 'closed',
      label: '治理复查已记录',
    })
    expect(brief.governance_recheck_memory.evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(brief.governance_recheck_memory.watch_items).toContain('下一章继续观察样章策略命中率')

    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-13T10:00:00.000Z',
    })

    expect(confirmedContext.governance_recheck_memory.evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(confirmedContext.chapter_target.governance_recheck_memory.watch_items).toContain('下一章继续观察样章策略命中率')
  })

  test('builds a pre-draft brief from context package and commercial scene cards', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          summary: '李超和张智在午夜校园醒来，必须在十点前进入宿舍。',
          conflict: '李超想靠蛮力破局，张智坚持先读规则。',
          ending_hook: '广播公布第一条规则，钟表指向九点五十八分。',
          word_target: target,
          scene_cards: [
            {
              scene_no: 1,
              title: '操场醒来',
              purpose: '确认穿越与身体异常。',
              conflict: '蛮力冲撞规则边界。',
              opening_hook: '车祸后的第一口冷风带着广播电流声。',
              reader_payoff: '超人力量首次展示，但规则空间能反制蛮力。',
              fear_point: '空校里影子会吞掉声音。',
              rule_pressure: '十点后不得离开宿舍。',
              information_gap: '广播是谁发出的。',
              reversal: '李超被无形墙弹回。',
              ending_hook_seed: '九点五十八分的倒计时。',
            },
          ],
        },
        writing_bible: {
          promise: '超人蛮力与规则智斗的双主角爽文。',
          style_lock: { payoff_density: '800-1200字一个小回报' },
        },
        setting_context: {
          required: ['午夜校园规则'],
          forbidden: ['规则源头真相'],
        },
      },
    )

    expect(brief.chapter_goal).toContain('午夜校园')
    expect(brief.reader_promise).toContain('超人')
    expect(brief.core_conflict).toContain('蛮力')
    expect(brief.key_settings).toContain('午夜校园规则')
    expect(brief.forbidden_content).toContain('规则源头真相')
    expect(brief.word_budget).toContain('4200')
    expect(brief.ending_hook).toContain('九点五十八分')
    expect(brief.scene_briefs[0].reader_payoff).toContain('规则空间')
  })

  test('reads runtime camelCase chapterTarget sceneCards when building pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧标题',
          summary: '旧摘要。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 8,
          title: '会长私印',
          summary: '运行时要求围绕私印缺页展开。',
          conflict: '会长想烧掉私印，主角必须当众保住证据。',
          endingHook: '缺页背面露出第三枚私印。',
          sceneCards: [
            {
              sceneNo: 1,
              title: '私印抢夺',
              purpose: '让证据从静态设定变成当场争夺。',
              conflict: '会长伸手夺印，主角必须在众目睽睽下反制。',
              openingHook: '火舌舔到私印边缘时，缺页忽然卷起第二层。',
              readerPayoff: '主角保住旧证并逼出新的缺页线索。',
              endingHookSeed: '缺页背面露出第三枚私印。',
            },
          ],
        },
      },
    )

    expect(brief.chapter_goal).toContain('私印缺页')
    expect(brief.core_conflict).toContain('会长想烧掉私印')
    expect(brief.scene_briefs).toHaveLength(1)
    expect(brief.scene_briefs[0].title).toBe('私印抢夺')
    expect(brief.scene_briefs[0].reader_payoff).toContain('旧证')
    expect(brief.ending_hook).toContain('第三枚私印')
  })

  test('builds an oh-story style chapter blueprint contract from scene cards', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 6,
        title: '当众反证',
        summary: '主角在审判庭用账本反证对手栽赃。',
        conflict: '对手逼主角认罪，主角必须证明账本被调包。',
        emotional_curve: '压迫 -> 反证 -> 爽感释放',
        ending_hook: '第二本账册从证人袖中滑落。',
        word_target: resolveChapterWordTarget({}, { chapter_no: 6 }, {}),
        scene_cards: [
          {
            scene_no: 1,
            title: '审判庭开局',
            purpose: '把主角逼到必须当众自证的处境。',
            conflict: '长老要求主角立刻认罪。',
            opening_hook: '第一句话就是认罪书。',
            required_beats: ['证人拿出账本', '主角发现墨迹不对'],
            information_gap: '谁换了账本。',
            characters_present: ['江辰', '周薄森', '钟嘉嘉'],
            reader_payoff: '读者看到主角先被压到绝境。',
          },
          {
            scene_no: 2,
            title: '反证爆开',
            purpose: '用旧印记证明账本调包。',
            conflict: '对手试图抢走证据。',
            action_beats: ['江辰按住账册', '钟嘉嘉拦住周薄森', '旧印记显形'],
            reversal: '账本反而证明对手动过手脚。',
            reader_payoff: '当众打脸并洗清污名。',
            ending_hook_seed: '第二本账册从证人袖中滑落。',
            state_changes_expected: ['江辰从被告变成反击者', '周薄森失去主动权'],
          },
        ],
      },
      storyline_context: {
        required: ['审判线必须推进到公开反证'],
        payoff: [{ name: '账本伏笔', usage_type: 'payoff' }],
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
      { chapter_no: 6, title: '当众反证' },
    )

    expect(brief.chapter_blueprint.version).toBe('oh_story_chapter_blueprint_v1')
    expect(brief.chapter_blueprint.target_emotion).toContain('压迫')
    expect(brief.chapter_blueprint.opening_hook).toContain('认罪书')
    expect(brief.chapter_blueprint.core_payoff).toContain('当众打脸')
    expect(brief.chapter_blueprint.content_outline.cause).toContain('审判庭')
    expect(brief.chapter_blueprint.causal_chain_contract.version).toBe('oh_story_five_act_causal_chain_v1')
    expect(brief.chapter_blueprint.causal_chain_contract.act_order.join('｜')).toContain('种子')
    expect(brief.chapter_blueprint.causal_chain_contract.act_order.join('｜')).toContain('生长')
    expect(brief.chapter_blueprint.causal_chain_contract.act_order.join('｜')).toContain('转折')
    expect(brief.chapter_blueprint.causal_chain_contract.act_order.join('｜')).toContain('冲刺')
    expect(brief.chapter_blueprint.causal_chain_contract.act_order.join('｜')).toContain('完成')
    expect(brief.chapter_blueprint.causal_chain_contract.act_functions.turn).toContain('质变')
    expect(brief.chapter_blueprint.causal_chain_contract.quality_checks.join('｜')).toContain('不能跳步')
    expect(brief.chapter_blueprint.plot_lines.mainline).toContain('账本反证')
    expect(brief.chapter_blueprint.character_order).toContain('江辰')
    expect(brief.chapter_blueprint.beat_sequence[0]).toMatchObject({ scene_no: 1, function_tag: '开篇钩子/铺垫' })
    expect(brief.chapter_blueprint.beat_density_contract).toMatchObject({
      version: 'oh_story_beat_density_v1',
      target_word_count: 4200,
      min_beat_count: 14,
      target_beat_count: 17,
      max_beat_count: 21,
      current_beat_count: 2,
      density_gap: 12,
    })
    expect(brief.chapter_blueprint.beat_density_contract.rule).toContain('200-300 字/个情节点')
    expect(brief.chapter_blueprint.cost_and_reward).toContain('当众打脸')
    expect(brief.chapter_blueprint.ending_contract.next_chapter_pull).toContain('第二本账册')
    expect(confirmedContext.chapter_target.chapter_blueprint.writing_intent).toContain('当众反证')
    expect(prompt).toContain('【章节蓝图合同】')
    expect(prompt).toContain('必须先执行 chapter_target.chapter_blueprint')
    expect(prompt).toContain('目标情绪、开篇钩子、核心回报')
    expect(prompt).toContain('五幕式因果链')
    expect(prompt).toContain('情节点密度')
    expect(prompt).toContain('200-300 字/个情节点')
    expect(prompt).toContain('beat_sequence.function_tag 决定每个情节点展开或带过')
    expect(prompt).toContain('关键揭露/打脸/高潮/爽点必须展开')
    expect(prompt).toContain('过渡/赶路/信息交代必须压缩')
    expect(prompt).toContain('本章目标 4200 字')
    expect(prompt).toContain('建议 14-21 个情节点')
    expect(prompt).toContain('种子')
    expect(prompt).toContain('生长')
    expect(prompt).toContain('转折')
    expect(prompt).toContain('冲刺')
    expect(prompt).toContain('完成')
    expect(prompt).toContain('不能跳步、不能乱序')
    expect(prompt).toContain('blueprint_receipts')
    expect(prompt).toContain('beat_density_contract')
    expect(prompt).toContain('target_emotion、opening_hook、core_payoff')
    expect(prompt.indexOf('【章节蓝图合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('adds an oh-story outline methods contract to chapter blueprint and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '旧城订单',
      genre: '都市系统逆袭',
      synopsis: '中年维修师靠职业成长系统接单翻身，但旧城区维修协会持续打压外来维修师。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统能识别设备隐藏故障并给出技能反馈',
          commercial_positioning: {
            selling_points: ['维修订单升级', '客户态度反转', '系统奖励即时反馈'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 6,
        title: '协会封单',
        summary: '维修协会用封单规则阻止主角接触旧城设备，主角必须当场证明封单规则有漏洞。',
        conflict: '协会会长不许主角碰设备，客户也担心惹怒协会。',
        ending_hook: '协会会长拿出第二份封单，指向主角刚接的医院设备。',
        scene_cards: [
          {
            scene_no: 1,
            title: '口头封单',
            purpose: '先用言语压迫制造冲突。',
            conflict: '协会会长当众宣布外来维修师不得接旧城订单。',
            reader_payoff: '主角被公开压制，读者等待反证。',
          },
          {
            scene_no: 2,
            title: '设备现场',
            purpose: '冲突升级到行动阻拦。',
            conflict: '协会成员挡住设备间门口，不让主角拆机。',
            action_beats: ['主角绕到旧线路口', '协会成员抢走工具箱', '客户要求立刻给结果'],
            reader_payoff: '主角必须用别人想不到的方法破局。',
          },
          {
            scene_no: 3,
            title: '当场反证',
            purpose: '决定胜负并留下下一冲突。',
            reversal: '主角用系统识别的隐藏故障证明协会规则掩盖事故。',
            reader_payoff: '客户从犹豫变成公开支持主角。',
            ending_hook_seed: '第二份封单指向医院设备。',
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
      { chapter_no: 6, title: '协会封单' },
    )

    expect(brief.chapter_blueprint.outline_methods_contract.version).toBe('oh_story_outline_methods_v1')
    expect(brief.chapter_blueprint.outline_methods_contract.five_step_outline.steps.join('｜')).toContain('确定高潮剧情')
    expect(brief.chapter_blueprint.outline_methods_contract.five_step_outline.story_lines.join('｜')).toContain('地图线')
    expect(brief.chapter_blueprint.outline_methods_contract.five_step_outline.opening_sequence.join('｜')).toContain('情节钩子')
    expect(brief.chapter_blueprint.outline_methods_contract.eight_node_story_structure.nodes.join('｜')).toContain('八节点故事结构')
    expect(brief.chapter_blueprint.outline_methods_contract.sweet_cycle_stages.join('｜')).toContain('爽文五阶段小循环')
    expect(brief.chapter_blueprint.outline_methods_contract.emotion_zigzag_stages.join('｜')).toContain('情绪拉扯五折线')
    expect(brief.chapter_blueprint.outline_methods_contract.five_drive_checks.join('｜')).toContain('五项驱动检查')
    expect(brief.chapter_blueprint.outline_methods_contract.detail_outline_rules.join('｜')).toContain('细纲:正文 = 1:2.5~1:3')
    expect(brief.chapter_blueprint.outline_methods_contract.similarity_guardrails.join('｜')).toContain('相同金手指逻辑禁止连续使用')
    expect(brief.chapter_blueprint.outline_methods_contract.reverse_design_rules.join('｜')).toContain('爽点倒推')
    expect(confirmedContext.chapter_target.chapter_blueprint.outline_methods_contract.quality_checks.join('｜')).toContain('同一套路间隔至少 3 个不同剧情类型')
    expect(prompt).toContain('【大纲方法合同】')
    expect(prompt).toContain('执行 chapter_target.chapter_blueprint.outline_methods_contract')
    expect(prompt).toContain('五步大纲创建法')
    expect(prompt).toContain('八节点故事结构')
    expect(prompt).toContain('爽文五阶段小循环')
    expect(prompt).toContain('情绪拉扯五折线')
    expect(prompt).toContain('五项驱动检查')
    expect(prompt).toContain('细纲:正文 = 1:2.5~1:3')
    expect(prompt).toContain('相同金手指逻辑禁止连续使用')
    expect(prompt).toContain('outline_methods_checks')
    expect(prompt.indexOf('【大纲方法合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('adds an oh-story small-outline four-step contract to chapter blueprint and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '缺页定位',
        summary: '主角把旧账缺页推进成公开证据。',
        conflict: '执事试图把缺页问题写成文书失误。',
        ending_hook: '缺页背面露出禁库编号。',
        word_target: resolveChapterWordTarget({}, { chapter_no: 7 }, {}),
        scene_cards: [
          {
            scene_no: 1,
            title: '缺页开场',
            purpose: '让读者确认缺页不是失误而是栽赃入口。',
            conflict: '执事用文书失误压过缺页。',
            reader_payoff: '缺页变成公开证据。',
            required_beats: ['江辰指出缺页页序', '证人被迫重新核对'],
          },
          {
            scene_no: 2,
            title: '回廊转场',
            purpose: '把众人从审判庭带到禁库门口。',
            reader_payoff: '禁库编号进入读者视野。',
            ending_hook_seed: '缺页背面露出禁库编号。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '缺页长篇' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '缺页长篇' },
      confirmedContext,
      null,
      { chapter_no: 7, title: '缺页定位' },
    )

    expect(brief.chapter_blueprint.small_outline_contract.version).toBe('oh_story_small_outline_four_step_v1')
    expect(brief.chapter_blueprint.small_outline_contract.steps.join('｜')).toContain('分段判断')
    expect(brief.chapter_blueprint.small_outline_contract.steps.join('｜')).toContain('标注目的和效果')
    expect(brief.chapter_blueprint.small_outline_contract.steps.join('｜')).toContain('标注详写/略写')
    expect(brief.chapter_blueprint.small_outline_contract.steps.join('｜')).toContain('快速定位')
    expect(brief.chapter_blueprint.small_outline_contract.purpose_effect_rules.join('｜')).toContain('不展开情节')
    expect(brief.chapter_blueprint.small_outline_contract.segment_cards[0]).toMatchObject({
      segment_no: 1,
      detail_level: 'expand',
    })
    expect(brief.chapter_blueprint.small_outline_contract.segment_cards[0].purpose).toContain('缺页')
    expect(brief.chapter_blueprint.small_outline_contract.segment_cards[1]).toMatchObject({
      segment_no: 2,
      detail_level: 'compress',
    })
    expect(prompt).toContain('小纲四步法')
    expect(prompt).toContain('分段判断')
    expect(prompt).toContain('目的和效果')
    expect(prompt).toContain('详写/略写')
    expect(prompt).toContain('快速定位')
    expect(prompt).toContain('small_outline_contract')
  })

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

  test('adds an oh-story plot dynamics contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 10,
        title: '假胜崩解',
        summary: '主角以为账本反证成功，却发现证人提前被换。',
        conflict: '旧证据能洗清罪名，但证人倒戈会反咬主角。',
        ending_hook: '被换掉的证人从屏风后走出来。',
        scene_cards: [
          {
            scene_no: 1,
            title: '证据上桌',
            purpose: '让主角获得阶段性假胜。',
            conflict: '对手质疑账本来源。',
            reader_payoff: '旧印章证明账本是真的。',
          },
          {
            scene_no: 2,
            title: '证人倒戈',
            purpose: '击碎假胜并推入绝境。',
            conflict: '证人当众改口。',
            reversal: '证人说账本是主角伪造。',
            reader_payoff: '读者意识到对手提前换了证人。',
            ending_hook_seed: '真正证人从屏风后走出来。',
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
      { chapter_no: 10, title: '假胜崩解' },
    )

    expect(brief.plot_dynamics_contract.version).toBe('oh_story_plot_dynamics_v1')
    expect(brief.plot_dynamics_contract.plot_loop.join('｜')).toContain('目标')
    expect(brief.plot_dynamics_contract.climax_formula.join('｜')).toContain('假胜')
    expect(brief.plot_dynamics_contract.climax_formula.join('｜')).toContain('崩解')
    expect(brief.plot_dynamics_contract.ab_outline.join('｜')).toContain('A 蓄压')
    expect(brief.plot_dynamics_contract.drive_mode_rules.join('｜')).toContain('事件驱动')
    expect(brief.plot_dynamics_contract.drive_mode_rules.join('｜')).toContain('每章给一个外部结果')
    expect(brief.plot_dynamics_contract.drive_mode_rules.join('｜')).toContain('每 3-5 章插一段情感停顿')
    expect(brief.plot_dynamics_contract.line_stagger_rules.join('｜')).toContain('主线和支线错开')
    expect(brief.plot_dynamics_contract.line_stagger_rules.join('｜')).toContain('战力提升线')
    expect(brief.plot_dynamics_contract.line_stagger_rules.join('｜')).toContain('装备收获线')
    expect(confirmedContext.chapter_target.plot_dynamics_contract.quality_checks.join('｜')).toContain('目标→阻碍→行动')
    expect(prompt).toContain('【剧情动力合同】')
    expect(prompt).toContain('执行 chapter_target.plot_dynamics_contract')
    expect(prompt).toContain('蓄能 → 假胜 → 崩解')
    expect(prompt).toContain('驱动方式')
    expect(prompt).toContain('每章给一个外部结果')
    expect(prompt).toContain('多线错峰')
    expect(prompt).toContain('plot_dynamics_checks')
    expect(prompt.indexOf('【剧情动力合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('adds an oh-story story power contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      writing_bible: {
        story_power_contract: {
          source: 'manual_story_power',
          action_rules: ['每个场景必须让主角用动作改变局势。'],
        },
      },
      chapter_target: {
        chapter_no: 11,
        title: '阵盘入局',
        summary: '主角要用裂纹阵盘证明旧案有人动手脚。',
        conflict: '执事封锁证物，证人不敢开口。',
        ending_hook: '裂纹阵盘反向亮起，指向内门库房。',
        scene_cards: [
          {
            scene_no: 1,
            title: '封锁证物',
            goal: '主角要拿到旧案阵盘。',
            conflict: '执事不许任何人碰证物。',
            action: '主角当众押上自己的残阵盘换一次验阵机会。',
            reader_payoff: '阵盘裂纹和旧案证物对上。',
            state_delta: '主角从被堵门变成掌握验阵资格。',
          },
          {
            scene_no: 2,
            title: '反向亮阵',
            goal: '主角证明证物被动过。',
            conflict: '证人害怕内门报复。',
            action: '主角用残阵盘逼出反向阵纹。',
            reader_payoff: '读者看到幕后线索指向内门库房。',
            exit_state: '旧案从无头案变成可追查的内门线索。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '寒门阵师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '寒门阵师' },
      confirmedContext,
      null,
      { chapter_no: 11, title: '阵盘入局' },
    )

    expect(brief.story_power_contract.source).toBe('manual_story_power')
    expect(brief.story_power_contract.story_power_dimensions.join('｜')).toContain('故事五维')
    expect(brief.story_power_contract.action_rules.join('｜')).toContain('每个场景必须让主角用动作改变局势')
    expect(brief.story_power_contract.beginning_end_rules.join('｜')).toContain('有始有终')
    expect(brief.story_power_contract.causal_feedback_rules.join('｜')).toContain('因果反馈')
    expect(confirmedContext.chapter_target.story_power_contract.quality_checks.join('｜')).toContain('行动是否改变局势')
    expect(prompt).toContain('【故事力合同】')
    expect(prompt).toContain('执行 chapter_target.story_power_contract')
    expect(prompt).toContain('故事五维')
    expect(prompt).toContain('有动作才是故事')
    expect(prompt).toContain('有始有终')
    expect(prompt).toContain('因果反馈')
    expect(prompt).toContain('story_power_checks')
    expect(prompt.indexOf('【故事力合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit plot dynamics contract from scene progression context', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 10,
        title: '假胜崩解',
        summary: '主角以为账本反证成功，却发现证人提前被换。',
        conflict: '旧证据能洗清罪名，但证人倒戈会反咬主角。',
        ending_hook: '被换掉的证人从屏风后走出来。',
        plot_dynamics_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认本章有假胜、崩解和新的悬置收尾。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '证据上桌',
            purpose: '让主角获得阶段性假胜。',
            conflict: '对手质疑账本来源。',
            reader_payoff: '旧印章证明账本是真的。',
          },
          {
            scene_no: 2,
            title: '证人倒戈',
            purpose: '击碎假胜并推入绝境。',
            conflict: '证人当众改口。',
            reversal: '证人说账本是主角伪造。',
            reader_payoff: '读者意识到对手提前换了证人。',
            ending_hook_seed: '真正证人从屏风后走出来。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)

    expect(brief.plot_dynamics_contract.source).toBe('manual_incomplete')
    expect(brief.plot_dynamics_contract.quality_checks).toEqual(['必须确认本章有假胜、崩解和新的悬置收尾。'])
    expect(brief.plot_dynamics_contract.plot_loop.join('｜')).toContain('主角以为账本反证成功')
    expect(brief.plot_dynamics_contract.plot_loop.join('｜')).toContain('证人倒戈会反咬主角')
    expect(brief.plot_dynamics_contract.plot_loop.join('｜')).toContain('被换掉的证人从屏风后走出来')
    expect(brief.plot_dynamics_contract.climax_formula.join('｜')).toContain('假胜')
    expect(brief.plot_dynamics_contract.climax_formula.join('｜')).toContain('崩解')
    expect(brief.plot_dynamics_contract.ab_outline.join('｜')).toContain('场景2')
    expect(brief.plot_dynamics_contract.scene_purpose_map.join('｜')).toContain('击碎假胜并推入绝境')
    expect(brief.plot_dynamics_contract.revision_priorities.join('｜')).toContain('补目标阻碍行动反馈闭环')
  })

  test('adds an oh-story continuity heat contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      longform_memory_capsule: {
        open_questions: [
          { text: '湿漉漉学生到底是谁', age_chapters: 2 },
        ],
        payoff_debts: [
          { text: '旧钥匙需要回收', age_chapters: 4 },
        ],
      },
      reader_expectation_debt_context: {
        must_carry: [
          { text: '门外水声必须继续施压', source_chapter_no: 7 },
        ],
        keep_alive: [
          { text: '宿舍门锁规则不能突然消失' },
        ],
      },
      storyline_context: {
        required: ['追查湿漉漉学生身份'],
        chapter_usage: [
          { type: 'plant', name: '旧钥匙缺口', summary: '旧钥匙和宿舍旧锁有关' },
          { type: 'payoff', name: '水迹名字', summary: '水迹名字指向三年前失踪者' },
        ],
      },
      character_arc_context: {
        relationship_shift: '李超和室友从互相隐瞒变成共同验证规则。',
      },
      chapter_target: {
        chapter_no: 11,
        title: '旧钥匙回声',
        summary: '主角用旧钥匙验证宿舍门锁规则。',
        conflict: '规则要求不能开门，但旧钥匙只对门外锁孔有反应。',
        ending_hook: '旧钥匙插进锁孔后，门内传来另一个李超的声音。',
        scene_cards: [
          {
            scene_no: 1,
            title: '钥匙试锁',
            purpose: '让旧钥匙从冷伏笔升温为当前压力。',
            conflict: '室友阻止主角靠近门。',
            reader_payoff: '确认旧钥匙与门锁规则相关。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '超人的规则怪谈世界' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      confirmedContext,
      null,
      { chapter_no: 11, title: '旧钥匙回声' },
    )

    expect(brief.continuity_heat_contract.version).toBe('oh_story_continuity_heat_v1')
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('hot')
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('warm')
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('cold')
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('archived')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('湿漉漉学生到底是谁')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('旧钥匙需要回收')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('旧钥匙缺口')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('李超和室友')
    expect(confirmedContext.chapter_target.continuity_heat_contract.watch_items.join('｜')).toContain('门外水声')
    expect(prompt).toContain('【连续性热度合同】')
    expect(prompt).toContain('执行 chapter_target.continuity_heat_contract')
    expect(prompt).toContain('hot/warm/cold/archived')
    expect(prompt).toContain('continuity_heat_checks')
    expect(prompt.indexOf('【连续性热度合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit continuity heat contract from memory and expectation context', () => {
    const contextPackage = {
      longform_memory_capsule: {
        open_questions: [
          { text: '湿漉漉学生到底是谁', age_chapters: 2 },
        ],
        payoff_debts: [
          { text: '旧钥匙需要回收', age_chapters: 4 },
        ],
      },
      reader_expectation_debt_context: {
        must_carry: [
          { text: '门外水声必须继续施压', source_chapter_no: 7 },
        ],
        keep_alive: [
          { text: '宿舍门锁规则不能突然消失' },
        ],
      },
      storyline_context: {
        required: ['追查湿漉漉学生身份'],
        forbidden: ['不能让旧钥匙凭空消失'],
        chapter_usage: [
          { type: 'plant', name: '旧钥匙缺口', summary: '旧钥匙和宿舍旧锁有关' },
          { type: 'dormant', name: '镜中脚印', summary: '本章暂不推进镜中脚印' },
        ],
      },
      character_arc_context: {
        relationship_shift: '李超和室友从互相隐瞒变成共同验证规则。',
      },
      chapter_target: {
        chapter_no: 11,
        title: '旧钥匙回声',
        summary: '主角用旧钥匙验证宿舍门锁规则。',
        conflict: '规则要求不能开门，但旧钥匙只对门外锁孔有反应。',
        ending_hook: '旧钥匙插进锁孔后，门内传来另一个李超的声音。',
        continuity_heat_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认 hot/warm/cold 元素都有处理理由。'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '规则怪谈长篇' }, contextPackage)

    expect(brief.continuity_heat_contract.source).toBe('manual_incomplete')
    expect(brief.continuity_heat_contract.quality_checks).toEqual(['必须确认 hot/warm/cold 元素都有处理理由。'])
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('hot')
    expect(brief.continuity_heat_contract.active_expectations.join('｜')).toContain('门外水声必须继续施压')
    expect(brief.continuity_heat_contract.active_expectations.join('｜')).toContain('旧钥匙插进锁孔后')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('湿漉漉学生到底是谁')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('旧钥匙需要回收')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('旧钥匙缺口')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('李超和室友')
    expect(brief.continuity_heat_contract.dormant_allowed.join('｜')).toContain('不能让旧钥匙凭空消失')
    expect(brief.continuity_heat_contract.dormant_allowed.join('｜')).toContain('镜中脚印')
    expect(brief.continuity_heat_contract.revision_priorities.join('｜')).toContain('升温冷伏笔')
  })

  test('adds an oh-story character relation contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      character_arc_context: {
        desire: '李玄要保住试炼资格，不能只是替林青禾完成调查。',
        relationship_shift: '林青禾从旁观者转为愿意公开作证。',
        voice_anchor: '李玄克制短句，林青禾只给事实，执事用命令压人。',
      },
      setting_context: {
        entities: [
          {
            id: 801,
            entity_type: 'relationship_arc',
            name: '李玄与林青禾互信线',
            summary: '从互相试探走向公开作证。',
            payload_json: {
              related_characters: ['李玄', '林青禾'],
              relationship_type: '联盟型',
              test: '林青禾必须冒着被执事记恨的风险作证。',
              attitude_shift: '旁观 -> 试探 -> 公开作证',
            },
          },
          {
            id: 802,
            entity_type: 'relationship_arc',
            name: '李玄与执事压迫线',
            summary: '执事用权威逼李玄交出阵图。',
            payload_json: {
              related_characters: ['李玄', '执事'],
              relationship_type: '权威型',
              test: '李玄必须在不彻底暴露底牌的情况下顶住命令。',
            },
          },
        ],
        chapter_usage: [
          { entity_id: 801, name: '李玄与林青禾互信线', usage_type: 'advance', expected_state_change: { relationship_shift: '林青禾公开作证' } },
          { entity_id: 802, name: '李玄与执事压迫线', usage_type: 'advance', expected_state_change: { pressure: '执事当众命令交出阵图' } },
        ],
      },
      chapter_target: {
        chapter_no: 12,
        title: '试炼前夜',
        summary: '李玄在试炼前夜被执事逼着交出阵图，林青禾必须决定是否作证。',
        conflict: '执事用权威压住所有人，林青禾担心作证会牵连家族。',
        ending_hook: '林青禾刚开口，执事身后的阵盘裂开第二道光。',
        scene_cards: [
          {
            scene_no: 1,
            title: '执事逼供',
            purpose: '制造权威压迫，让李玄主动争取试炼资格。',
            conflict: '执事命令李玄交出阵图。',
            characters_present: ['李玄', '林青禾', '执事'],
            relationship_type: '权威型',
            relationship_test: '李玄顶住命令但不能完全暴露残阵。',
          },
          {
            scene_no: 2,
            title: '公开作证',
            purpose: '让林青禾从旁观转为公开作证。',
            conflict: '作证会让林青禾得罪执事。',
            characters_present: ['李玄', '林青禾'],
            relationship_type: '联盟型',
            relationship_shift: '林青禾从旁观者变成同盟。',
            reader_payoff: '互信线出现第一次可见推进。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '残阵问道' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '残阵问道' },
      confirmedContext,
      null,
      { chapter_no: 12, title: '试炼前夜' },
    )

    expect(brief.character_relation_contract.version).toBe('oh_story_character_relation_v1')
    expect(brief.character_relation_contract.relationship_types.join('｜')).toContain('联盟型')
    expect(brief.character_relation_contract.relationship_types.join('｜')).toContain('权威型')
    expect(brief.character_relation_contract.important_relationships.join('｜')).toContain('李玄与林青禾互信线')
    expect(brief.character_relation_contract.tests_or_pressure.join('｜')).toContain('公开作证')
    expect(brief.character_relation_contract.independent_goals.join('｜')).toContain('保住试炼资格')
    expect(brief.character_relation_contract.goal_ownership_rules.join('｜')).toContain('主角目标必须属于自己的')
    expect(brief.character_relation_contract.goal_ownership_rules.join('｜')).toContain('帮别人实现目标')
    expect(brief.character_relation_contract.relationship_life_rules.join('｜')).toContain('角色生命中有恋爱之外的内容')
    expect(brief.character_relation_contract.relationship_life_rules.join('｜')).toContain('情感工具人')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('配角期待枢纽')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('任务基地')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('短期和长期期待')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('损失厌恶')
    expect(brief.character_relation_contract.attitude_shifts.join('｜')).toContain('旁观')
    expect(confirmedContext.chapter_target.character_relation_contract.quality_checks.join('｜')).toContain('关系类型明确')
    expect(prompt).toContain('【角色关系合同】')
    expect(prompt).toContain('执行 chapter_target.character_relation_contract')
    expect(prompt).toContain('目标归属')
    expect(prompt).toContain('主角目标必须属于自己的')
    expect(prompt).toContain('角色不止恋爱')
    expect(prompt).toContain('恋爱之外的内容')
    expect(prompt).toContain('配角期待枢纽')
    expect(prompt).toContain('任务基地')
    expect(prompt).toContain('短期和长期期待')
    expect(prompt).toContain('关系类型明确')
    expect(prompt).toContain('character_relation_checks')
    expect(prompt.indexOf('【角色关系合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit character relation contract from relation context', () => {
    const contextPackage = {
      character_arc_context: {
        desire: '李玄要保住试炼资格，不能只是替林青禾完成调查。',
        relationship_shift: '林青禾从旁观者转为愿意公开作证。',
      },
      setting_context: {
        entities: [
          {
            id: 801,
            entity_type: 'relationship_arc',
            name: '李玄与林青禾互信线',
            summary: '从互相试探走向公开作证。',
            payload_json: {
              relationship_type: '联盟型',
              test: '林青禾必须冒着被执事记恨的风险作证。',
              attitude_shift: '旁观 -> 试探 -> 公开作证',
            },
          },
        ],
        chapter_usage: [
          { entity_id: 801, name: '李玄与林青禾互信线', usage_type: 'advance', expected_state_change: { relationship_shift: '林青禾公开作证' } },
        ],
      },
      chapter_target: {
        chapter_no: 12,
        title: '试炼前夜',
        summary: '李玄在试炼前夜被执事逼着交出阵图，林青禾必须决定是否作证。',
        conflict: '执事用权威压住所有人，林青禾担心作证会牵连家族。',
        character_relation_contract: {
          version: 'oh_story_character_relation_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须确认关系变化有正文证据。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '公开作证',
            purpose: '让林青禾从旁观转为公开作证。',
            conflict: '作证会让林青禾得罪执事。',
            relationship_type: '联盟型',
            relationship_shift: '林青禾从旁观者变成同盟。',
            reader_payoff: '互信线出现第一次可见推进。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '残阵问道' }, contextPackage)

    expect(brief.character_relation_contract.source).toBe('manual_incomplete')
    expect(brief.character_relation_contract.quality_checks).toEqual(['必须确认关系变化有正文证据。'])
    expect(brief.character_relation_contract.relationship_types.join('｜')).toContain('联盟型')
    expect(brief.character_relation_contract.important_relationships.join('｜')).toContain('李玄与林青禾互信线')
    expect(brief.character_relation_contract.independent_goals.join('｜')).toContain('保住试炼资格')
    expect(brief.character_relation_contract.goal_ownership_rules.join('｜')).toContain('主角目标必须属于自己的')
    expect(brief.character_relation_contract.relationship_life_rules.join('｜')).toContain('角色生命中有恋爱之外的内容')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('配角期待枢纽')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('任务基地')
    expect(brief.character_relation_contract.tests_or_pressure.join('｜')).toContain('公开作证')
    expect(brief.character_relation_contract.attitude_shifts.join('｜')).toContain('旁观')
  })

  test('adds an oh-story character behavior contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 9,
        title: '旧夹克的录音',
        summary: '主角看似退让，实际用旧夹克里的录音笔收集执事勒索证据。',
        conflict: '执事逼主角交出维修资格，反派学徒试图让主角当众失态。',
        ending_hook: '录音里传出执事和协会会长的真实交易。',
        character_arc_brief: {
          desire: '保住维修资格并拿回母亲旧铺。',
          flaw_pressure: '遇到权威压迫时习惯先装作退让。',
          growth_beat: '不再只躲在暗处，而是当众按下录音播放键。',
          voice_anchor: '短句反问，动作克制。',
          forbidden_reveal: '不能提前说出他已经录音。',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧夹克',
            purpose: '展示身份标签和表现标签反差。',
            conflict: '执事当众嘲笑主角只敢低头。',
            characters_present: ['李玄', '执事', '林青禾'],
            reader_payoff: '主角表面沉默，实际摸到旧夹克里的录音笔。',
          },
          {
            scene_no: 2,
            title: '当众播放',
            purpose: '用行为亮出内核标签。',
            conflict: '反派学徒抢先指认主角伪造资格。',
            characters_present: ['李玄', '执事', '反派学徒'],
            action_beats: ['李玄没有争辩', '他把旧夹克挂到扩音阵旁', '录音笔开始播放'],
            reversal: '执事的勒索原话被全场听见。',
            reader_payoff: '冷静有计划的内核显形。',
          },
        ],
      },
      story_state: {
        characters: [
          { name: '李玄', role: '落魄维修师', traits: ['嘴毒心软', '看似退让', '冷静有计划'], goal: '拿回母亲旧铺', flaw: '面对权威时习惯藏招' },
          { name: '执事', role: '阶段小反派', traits: ['贪财', '爱用规则压人'], goal: '逼主角交出维修资格' },
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
      { chapter_no: 9, title: '旧夹克的录音' },
    )

    expect(brief.character_behavior_contract.version).toBe('oh_story_character_behavior_v1')
    expect(brief.character_behavior_contract.motivation_chain.join('｜')).toContain('起因')
    expect(brief.character_behavior_contract.motivation_chain.join('｜')).toContain('保住维修资格')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('起因必须具体')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('被欺负')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('情感层面')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('要成为最强')
    expect(brief.character_behavior_contract.layered_tags.join('｜')).toContain('身份标签')
    expect(brief.character_behavior_contract.layered_tags.join('｜')).toContain('内核标签')
    expect(brief.character_behavior_contract.behavior_rules.join('｜')).toContain('展示优于告知')
    expect(brief.character_behavior_contract.protagonist_composure_rules.join('｜')).toContain('升级线与主角反应线分开管理')
    expect(brief.character_behavior_contract.protagonist_composure_rules.join('｜')).toContain('低级挑衅')
    expect(brief.character_behavior_contract.protagonist_composure_rules.join('｜')).toContain('轻描淡写')
    expect(brief.character_behavior_contract.strong_association_rules.join('｜')).toContain('每个重要角色至少 3 个强关联设定')
    expect(brief.character_behavior_contract.strong_association_rules.join('｜')).toContain('核心梗装逼爽点')
    expect(brief.character_behavior_contract.strong_association_rules.join('｜')).toContain('弱关联不喧宾夺主')
    expect(brief.character_behavior_contract.memory_anchors.join('｜')).toContain('旧夹克')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('角色定位')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('身份标签')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('外貌特征')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('核心目标')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('核心动机')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('致命弱点')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('口头禅/标志动作')
    expect((brief.character_behavior_contract.supporting_role_exit_rules || []).join('｜')).toContain('退场方式')
    expect((brief.character_behavior_contract.supporting_role_exit_rules || []).join('｜')).toContain('同一场景配角不超过 3 个有台词')
    expect((brief.character_behavior_contract.behavior_repeat_rules || []).join('｜')).toContain('行为重复点')
    expect((brief.character_behavior_contract.behavior_repeat_rules || []).join('｜')).toContain('不同场景重复')
    expect((brief.character_behavior_contract.character_driven_event_rules || []).join('｜')).toContain('人推事件')
    expect((brief.character_behavior_contract.character_driven_event_rules || []).join('｜')).toContain('从人物动机找方向')
    expect((brief.character_behavior_contract.character_driven_event_rules || []).join('｜')).toContain('不要硬编剧情')
    expect((brief.character_behavior_contract.protagonist_red_line_rules || []).join('｜')).toContain('圣母')
    expect((brief.character_behavior_contract.protagonist_red_line_rules || []).join('｜')).toContain('无脑战斗机器')
    expect((brief.character_behavior_contract.protagonist_red_line_rules || []).join('｜')).toContain('自暴自弃')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('社会身份')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('身世')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('金手指')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('性格')
    expect(brief.character_behavior_contract.antagonist_logic.join('｜')).toContain('反派的行为必须有内在逻辑')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('反派建立四要素')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('实力展示')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('动机可信')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('真实威胁')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('反派也有梦想')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('自己故事')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('理念冲突')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('反派层级表')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('小反派')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('中等反派')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('退场')
    expect(confirmedContext.chapter_target.character_behavior_contract.quality_checks.join('｜')).toContain('主角行为三必须')
    expect(prompt).toContain('【角色行为合同】')
    expect(prompt).toContain('执行 chapter_target.character_behavior_contract')
    expect(prompt).toContain('动机链')
    expect(prompt).toContain('动机具体性')
    expect(prompt).toContain('起因必须具体')
    expect(prompt).toContain('情感层面')
    expect(prompt).toContain('三层标签反差')
    expect(prompt).toContain('主角逼格反应')
    expect(prompt).toContain('升级线与主角反应线分开管理')
    expect(prompt).toContain('低级挑衅')
    expect(prompt).toContain('人设强关联')
    expect(prompt).toContain('每个重要角色至少 3 个强关联')
    expect(prompt).toContain('角色卡必备项')
    expect(prompt).toContain('配角退场规划')
    expect(prompt).toContain('行为重复点')
    expect(prompt).toContain('人推事件')
    expect(prompt).toContain('主角红线')
    expect(prompt).toContain('身份/金手指对齐')
    expect(prompt).toContain('反派建立四要素')
    expect(prompt).toContain('反派分量')
    expect(prompt).toContain('反派自我叙事')
    expect(prompt).toContain('反派层级')
    expect(prompt).toContain('character_behavior_checks')
    expect(prompt.indexOf('【角色行为合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit character behavior contract from character context', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 9,
        title: '旧夹克的录音',
        summary: '主角看似退让，实际用旧夹克里的录音笔收集执事勒索证据。',
        conflict: '执事逼主角交出维修资格，反派学徒试图让主角当众失态。',
        ending_hook: '录音里传出执事和协会会长的真实交易。',
        character_arc_brief: {
          desire: '保住维修资格并拿回母亲旧铺。',
          flaw_pressure: '遇到权威压迫时习惯先装作退让。',
          growth_beat: '不再只躲在暗处，而是当众按下录音播放键。',
          voice_anchor: '短句反问，动作克制。',
        },
        character_behavior_contract: {
          version: 'oh_story_character_behavior_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须确认角色行为由动机链驱动。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧夹克',
            purpose: '展示身份标签和表现标签反差。',
            conflict: '执事当众嘲笑主角只敢低头。',
            characters_present: ['李玄', '执事', '林青禾'],
            reader_payoff: '主角表面沉默，实际摸到旧夹克里的录音笔。',
          },
          {
            scene_no: 2,
            title: '当众播放',
            purpose: '用行为亮出内核标签。',
            conflict: '反派学徒抢先指认主角伪造资格。',
            characters_present: ['李玄', '执事', '反派学徒'],
            action_beats: ['李玄没有争辩', '他把旧夹克挂到扩音阵旁', '录音笔开始播放'],
          },
        ],
      },
      story_state: {
        characters: [
          { name: '李玄', role: '落魄维修师', traits: ['嘴毒心软', '看似退让', '冷静有计划'], goal: '拿回母亲旧铺', flaw: '面对权威时习惯藏招' },
          { name: '执事', role: '阶段小反派', traits: ['贪财', '爱用规则压人'], goal: '逼主角交出维修资格' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)

    expect(brief.character_behavior_contract.source).toBe('manual_incomplete')
    expect(brief.character_behavior_contract.quality_checks).toEqual(['必须确认角色行为由动机链驱动。'])
    expect(brief.character_behavior_contract.motivation_chain.join('｜')).toContain('保住维修资格')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('起因必须具体')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('动机演变有铺垫')
    expect(brief.character_behavior_contract.layered_tags.join('｜')).toContain('身份标签')
    expect(brief.character_behavior_contract.strong_association_rules.join('｜')).toContain('每个重要角色至少 3 个强关联设定')
    expect(brief.character_behavior_contract.memory_anchors.join('｜')).toContain('旧夹克')
    expect(brief.character_behavior_contract.supporting_role_functions.join('｜')).toContain('执事')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('角色定位')
    expect((brief.character_behavior_contract.supporting_role_exit_rules || []).join('｜')).toContain('退场方式')
    expect((brief.character_behavior_contract.behavior_repeat_rules || []).join('｜')).toContain('行为重复点')
    expect((brief.character_behavior_contract.character_driven_event_rules || []).join('｜')).toContain('人推事件')
    expect((brief.character_behavior_contract.protagonist_red_line_rules || []).join('｜')).toContain('圣母')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('金手指')
    expect(brief.character_behavior_contract.antagonist_logic.join('｜')).toContain('反派的行为必须有内在逻辑')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('反派建立四要素')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('真实威胁')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('反派也有梦想')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('理念冲突')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('反派层级表')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('最终 Boss')
  })

  test('adds an oh-story asset linkage contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      setting_context: {
        required: ['旧钥匙', '禁门规则'],
        entities: [
          {
            id: 901,
            entity_type: 'item',
            name: '旧钥匙',
            summary: '母亲旧铺留下的铜钥匙，齿纹能触发禁门规则。',
            constraints: { owner_rule: '只能由李玄持有', location: '旧夹克内袋' },
            state: { location: '旧夹克内袋', meaning: '母亲留下的信物' },
          },
          {
            id: 902,
            entity_type: 'rule',
            name: '禁门规则',
            summary: '午夜后禁门只能被带有旧铺印记的钥匙打开。',
            constraints: { trigger: '钥匙触碰门锁', cost: '暴露旧铺继承权' },
            state: { visibility: '半公开' },
          },
        ],
        chapter_usage: [
          {
            entity_id: 901,
            name: '旧钥匙',
            entity_type: 'item',
            usage_type: 'payoff',
            required: true,
            summary: '用旧钥匙证明主角拥有旧铺继承权。',
            expected_state_change: { meaning: '从信物变成证据' },
            constraints: { owner_rule: '只能由李玄持有' },
            state: { location: '旧夹克内袋' },
          },
          {
            entity_id: 902,
            name: '禁门规则',
            entity_type: 'rule',
            usage_type: 'trigger',
            required: true,
            summary: '触发禁门规则，让门锁当众显出旧铺印记。',
            expected_state_change: { visibility: '从传闻变成公开规则' },
            constraints: { trigger: '钥匙触碰门锁', cost: '暴露旧铺继承权' },
          },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄用旧钥匙触发禁门规则，证明旧铺继承权。',
        conflict: '执事说旧钥匙只是废铜，逼李玄交出维修资格。',
        ending_hook: '门锁亮出的旧铺印记，正好和协会会长袖口的印记一致。',
        scene_cards: [
          {
            scene_no: 1,
            title: '旧钥匙被嘲笑',
            purpose: '建立旧钥匙的初始意义和被轻视的压力。',
            conflict: '执事嘲笑旧钥匙只是废铜。',
            reader_payoff: '读者知道旧钥匙仍在李玄手里。',
          },
          {
            scene_no: 2,
            title: '禁门亮印',
            purpose: '让旧钥匙触发禁门规则，完成证据反转。',
            conflict: '触发规则会暴露李玄旧铺继承权。',
            action_beats: ['李玄把旧钥匙按进门锁', '禁门亮出旧铺印记', '执事第一次失声'],
            reader_payoff: '旧钥匙从信物变成证据。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const graphPromptService = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = graphPromptService.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 14, title: '禁门开锁' },
    )

    expect(brief.asset_linkage_contract.version).toBe('oh_story_asset_linkage_v1')
    expect(brief.asset_linkage_contract.key_assets.join('｜')).toContain('旧钥匙')
    expect(brief.asset_linkage_contract.key_assets.join('｜')).toContain('禁门规则')
    expect(brief.asset_linkage_contract.linkage_plan.join('｜')).toContain('从信物变成证据')
    expect(brief.asset_linkage_contract.usage_rules.join('｜')).toContain('信息跟着冲突走')
    expect(brief.asset_linkage_contract.three_appearance_plan.join('｜')).toContain('三次出现')
    const propAbilityRules = Array.isArray(brief.asset_linkage_contract.prop_ability_expectation_rules)
      ? brief.asset_linkage_contract.prop_ability_expectation_rules.join('｜')
      : ''
    expect(propAbilityRules).toContain('道具能力展示的8步期待模板')
    expect(propAbilityRules).toContain('鸡肋成神器')
    expect(confirmedContext.chapter_target.asset_linkage_contract.quality_checks.join('｜')).toContain('孤立资产')
    expect(prompt).toContain('【资产挂钩合同】')
    expect(prompt).toContain('执行 chapter_target.asset_linkage_contract')
    expect(prompt).toContain('旧钥匙')
    expect(prompt).toContain('功能、归属、触发条件、限制、后果')
    expect(prompt).toContain('道具能力展示的8步期待模板')
    expect(prompt).toContain('宝物功能强大')
    expect(prompt).toContain('鸡肋成神器')
    expect(prompt).toContain('asset_linkage_checks')
    expect(prompt.indexOf('【资产挂钩合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('carries relationship graph diagnostics into the asset linkage contract', () => {
    const contextPackage = {
      relationship_graph: {
        summary: {
          isolated_key_asset_count: 2,
          missing_owner_count: 1,
          dangling_relation_count: 1,
        },
        diagnostics: [
          {
            type: 'isolated_key_asset',
            severity: 'high',
            entity_id: 901,
            entity_name: '旧钥匙',
            message: '旧钥匙还没有和其他核心资产建立关系',
            evidence: 'relationship_graph',
          },
          {
            type: 'missing_owner',
            severity: 'warning',
            entity_id: 902,
            entity_name: '禁门规则',
            message: '禁门规则缺少拥有者或触发方',
            evidence: 'state_json.owner',
          },
        ],
      },
      setting_context: {
        entities: [
          { id: 901, entity_type: 'item', name: '旧钥匙', summary: '母亲旧铺留下的铜钥匙。' },
          { id: 902, entity_type: 'rule', name: '禁门规则', summary: '午夜后禁门只能被旧铺印记打开。' },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄用旧钥匙触发禁门规则，证明旧铺继承权。',
        conflict: '执事逼李玄交出维修资格。',
        ending_hook: '门锁亮出的旧铺印记，正好和协会会长袖口的印记一致。',
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const graphPromptService = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = graphPromptService.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 14, title: '禁门开锁' },
    )

    expect(brief.asset_linkage_contract.relationship_graph_risks.join('｜')).toContain('旧钥匙')
    expect(brief.asset_linkage_contract.relationship_graph_risks.join('｜')).toContain('缺少拥有者')
    expect(brief.asset_linkage_contract.quality_checks.join('｜')).toContain('关系图诊断')
    expect(brief.asset_linkage_contract.linkage_plan.join('｜')).toContain('旧钥匙还没有和其他核心资产建立关系')
    expect(prompt).toContain('关系图风险：旧钥匙')
    expect(prompt).toContain('不得让这些资产继续孤立')
    expect(prompt.indexOf('关系图风险：旧钥匙')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('adds an oh-story write preparation brief before prose generation', () => {
    const contextPackage = {
      relationship_graph: {
        diagnostics: [
          {
            type: 'isolated_key_asset',
            entity_name: '旧钥匙',
            message: '旧钥匙还没有和禁门规则建立现场关系',
          },
        ],
      },
      setting_context: {
        entities: [
          { id: 901, entity_type: 'item', name: '旧钥匙', summary: '母亲旧铺留下的铜钥匙。' },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄用旧钥匙触发禁门规则，证明旧铺继承权。',
        conflict: '执事逼李玄交出维修资格。',
        ending_hook: '门锁亮出的旧铺印记，正好和协会会长袖口的印记一致。',
        target_reader_contract: {
          reader_profile: '喜欢旧城规则破解的男频读者',
          reader_desires: ['旧钥匙规则破解爽点'],
        },
        genre_positioning_contract: {
          genre_tags: ['都市规则维修'],
          selling_points: ['旧城规则破解'],
        },
        core_contract_radar: {
          must_serve: ['旧钥匙必须服务旧城规则破解承诺'],
        },
        reader_retention_brief: {
          opening_hook: '前300字承接禁门规则代价',
        },
        state_tracking_contract: {
          version: 'oh_story_state_tracking_v1',
          source_readiness: [
            { key: 'chapter_blueprint', label: '本章细纲/场景卡', status: 'ready', evidence: '已有章节目标' },
            { key: 'previous_chapter', label: '上一章正文或上一章承接', status: 'missing', evidence: '缺少上一章承接' },
            { key: 'character_state', label: '角色状态', status: 'warn', evidence: '李玄持钥匙状态未确认' },
          ],
          source_requirements: ['本章细纲/场景卡', '上一章正文或上一章承接', '追踪/角色状态.md'],
        },
      },
      delivery_risk_carry_over: {
        label: '待修复 1',
        required_actions: ['补上旧钥匙的现场功能和代价。'],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const graphPromptService = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = graphPromptService.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 14, title: '禁门开锁' },
    )

    expect(brief.write_preparation_brief.version).toBe('oh_story_write_preparation_v1')
    expect(brief.write_preparation_brief.readiness_status).toBe('needs_context')
    expect(brief.write_preparation_brief.source_gaps.join('｜')).toContain('上一章正文或上一章承接')
    expect(brief.write_preparation_brief.source_gaps.join('｜')).toContain('角色状态')
    expect(brief.write_preparation_brief.asset_risks.join('｜')).toContain('旧钥匙')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('目标读者')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('题材定位')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('特殊题材')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('核心承诺')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('追读留存')
    expect(brief.write_preparation_brief.must_confirm.join('｜')).toContain('补上旧钥匙')
    expect(brief.write_preparation_brief.execution_order.join('｜')).toContain('状态筛选')
    expect(brief.write_preparation_brief.execution_order.join('｜')).toContain('文风召回')
    expect(brief.write_preparation_brief.execution_order.join('｜')).toContain('意图确认')
    expect(brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('状态筛选'))).toBeLessThan(
      brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('文风召回')),
    )
    expect(brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('文风召回'))).toBeLessThan(
      brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('意图确认')),
    )
    expect(brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('意图确认'))).toBeLessThan(
      brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('章节蓝图')),
    )
    expect(confirmedContext.chapter_target.write_preparation_brief.source_gaps.join('｜')).toContain('上一章正文')
    expect(prompt).toContain('【写前准备卡】')
    expect(prompt).toContain('必须先确认来源就绪、资产关系、章节蓝图和读者回报')
    expect(prompt).toContain('上一章正文或上一章承接')
    expect(prompt).toContain('关系图风险')
    expect(prompt).toContain('creation_contract_checklist')
    expect(prompt).toContain('创作契约清单')
    expect(prompt).toContain('旧钥匙规则破解爽点')
    expect(prompt).toContain('pre_draft_execution_receipts')
    expect(prompt).toContain('write_preparation_checks')
    expect(prompt).toContain('写前准备回执')
    expect(prompt.indexOf('【写前准备卡】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit asset linkage contract from setting usage', () => {
    const contextPackage = {
      setting_context: {
        required: ['旧钥匙', '禁门规则'],
        entities: [
          {
            id: 901,
            entity_type: 'item',
            name: '旧钥匙',
            summary: '母亲旧铺留下的铜钥匙，齿纹能触发禁门规则。',
            constraints: { owner_rule: '只能由李玄持有', location: '旧夹克内袋' },
            state: { location: '旧夹克内袋', meaning: '母亲留下的信物' },
          },
          {
            id: 902,
            entity_type: 'rule',
            name: '禁门规则',
            summary: '午夜后禁门只能被带有旧铺印记的钥匙打开。',
            constraints: { trigger: '钥匙触碰门锁', cost: '暴露旧铺继承权' },
          },
        ],
        chapter_usage: [
          {
            entity_id: 901,
            name: '旧钥匙',
            entity_type: 'item',
            usage_type: 'payoff',
            required: true,
            summary: '用旧钥匙证明主角拥有旧铺继承权。',
            expected_state_change: { meaning: '从信物变成证据' },
          },
          {
            entity_id: 902,
            name: '禁门规则',
            entity_type: 'rule',
            usage_type: 'trigger',
            required: true,
            summary: '触发禁门规则，让门锁当众显出旧铺印记。',
            expected_state_change: { visibility: '从传闻变成公开规则' },
          },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄用旧钥匙触发禁门规则，证明旧铺继承权。',
        conflict: '执事说旧钥匙只是废铜，逼李玄交出维修资格。',
        asset_linkage_contract: {
          version: 'oh_story_asset_linkage_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须确认孤立资产已经挂到冲突和回报上。'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)

    expect(brief.asset_linkage_contract.source).toBe('manual_incomplete')
    expect(brief.asset_linkage_contract.quality_checks).toEqual(['必须确认孤立资产已经挂到冲突和回报上。'])
    expect(brief.asset_linkage_contract.key_assets.join('｜')).toContain('旧钥匙')
    expect(brief.asset_linkage_contract.key_assets.join('｜')).toContain('禁门规则')
    expect(brief.asset_linkage_contract.linkage_plan.join('｜')).toContain('从信物变成证据')
    expect(brief.asset_linkage_contract.state_tracking.join('｜')).toContain('旧钥匙')
    expect(brief.asset_linkage_contract.three_appearance_plan.join('｜')).toContain('三次出现')
  })

  test('adds an oh-story state tracking contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      continuity: {
        previous_chapter: {
          chapter_no: 13,
          title: '旧钥匙缺口',
          ending_hook: '旧钥匙在禁门前自己发出铜鸣。',
          ending_excerpt: '李玄刚握紧旧钥匙，林青禾就看见禁门上的旧铺印记亮了一瞬。',
        },
      },
      story_state: {
        characters: [
          {
            name: '李玄',
            role: '旧铺继承人',
            current_state: {
              location: '禁门前',
              ability_status: '残阵只能维持三息',
              items: ['旧钥匙'],
              knowledge_scope: ['知道旧钥匙能触发禁门'],
              public_image: '众人眼中的落魄维修师',
            },
          },
          {
            name: '林青禾',
            role: '见证人',
            current_state: {
              location: '禁门前',
              relationship_attitudes: '愿意替李玄作证，但仍担心得罪执事',
              knowledge_scope: ['看见旧铺印记亮过一次'],
            },
          },
        ],
      },
      setting_context: {
        required: ['禁门规则'],
        entities: [
          {
            id: 902,
            entity_type: 'rule',
            name: '禁门规则',
            summary: '午夜后禁门只能被带有旧铺印记的钥匙打开。',
            constraints: { trigger: '旧钥匙触碰门锁', cost: '暴露继承权' },
            state: { visibility: '半公开' },
          },
          {
            id: 903,
            entity_type: 'foreshadowing',
            name: '旧钥匙缺口',
            summary: '第13章旧钥匙在禁门前自鸣，暗示它与禁门规则有关。',
            state: { planted_chapter: 13, status: '待回收' },
          },
        ],
        chapter_usage: [
          { entity_id: 902, name: '禁门规则', entity_type: 'rule', usage_type: 'trigger', required: true },
          { entity_id: 903, name: '旧钥匙缺口', entity_type: 'foreshadowing', usage_type: 'payoff', required: true },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄用旧钥匙触发禁门规则，林青禾必须确认自己上一章看到的旧铺印记。',
        conflict: '执事逼林青禾否认上一章所见，李玄的残阵只能维持三息。',
        ending_hook: '禁门打开后，门内站着本该失踪的旧铺掌柜。',
        scene_cards: [
          {
            scene_no: 1,
            title: '禁门前',
            characters_present: ['李玄', '林青禾', '执事'],
            purpose: '接住上一章旧钥匙自鸣，逼林青禾表态。',
            conflict: '执事逼林青禾改口。',
          },
          {
            scene_no: 2,
            title: '三息开锁',
            characters_present: ['李玄', '林青禾'],
            purpose: '让李玄在残阵三息内触发禁门规则。',
            conflict: '残阵即将熄灭。',
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
      { chapter_no: 14, title: '禁门开锁' },
    )

    expect(brief.state_tracking_contract.version).toBe('oh_story_state_tracking_v1')
    expect(brief.state_tracking_contract.character_states.join('｜')).toContain('李玄')
    expect(brief.state_tracking_contract.character_states.join('｜')).toContain('残阵只能维持三息')
    expect(brief.state_tracking_contract.character_states.join('｜')).toContain('林青禾')
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toContain('旧钥匙缺口')
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toContain('第13章')
    expect(brief.state_tracking_contract.world_constraints.join('｜')).toContain('禁门规则')
    expect(brief.state_tracking_contract.source_readiness.some((item: any) => item.key === 'chapter_blueprint' && item.status === 'ready')).toBe(true)
    expect(brief.state_tracking_contract.source_readiness.some((item: any) => item.key === 'previous_chapter' && item.status === 'ready')).toBe(true)
    expect(brief.state_tracking_contract.source_readiness.some((item: any) => item.key === 'character_state' && item.status === 'ready')).toBe(true)
    expect(brief.state_tracking_contract.source_readiness.some((item: any) => item.key === 'foreshadowing_history' && item.status === 'ready')).toBe(true)
    expect(brief.state_tracking_contract.source_readiness.some((item: any) => item.key === 'world_constraints' && item.status === 'ready')).toBe(true)
    expect(brief.state_tracking_contract.filter_rules.join('｜')).toContain('只保留')
    expect(confirmedContext.chapter_target.state_tracking_contract.source_requirements.join('｜')).toContain('本章细纲')
    expect(confirmedContext.chapter_target.state_tracking_contract.source_readiness.map((item: any) => item.key)).toContain('previous_chapter')
    expect(prompt).toContain('【状态筛选合同】')
    expect(prompt).toContain('执行 chapter_target.state_tracking_contract')
    expect(prompt).toContain('来源就绪表')
    expect(prompt).toContain('previous_chapter')
    expect(prompt).toContain('本节速记')
    expect(prompt).toContain('角色状态')
    expect(prompt).toContain('相关伏笔/前史')
    expect(prompt).toContain('世界约束')
    expect(prompt).toContain('本轮 workflow 内实际读取或刚更新')
    expect(prompt).toContain('不得用未标明来源的聊天记忆替代')
    expect(prompt).toContain('state_tracking_checks')
    expect(prompt.indexOf('【状态筛选合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('chapter 1 pre-draft brief derives foreshadowing and world constraints from seed materials', async () => {
    const { buildChapterPreDraftBrief } = await import('./novel-writing-service')
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '夜市回声',
        goal: '主角第一次确认回声规则与代价',
        summary: '顾临在夜市听到异常回声，被迫验证规则。',
        conflict: '真凶势力试图掩盖异常。',
        ending_hook: '回声指向旧案物证。',
        scene_cards: [
          { scene_no: 1, title: '夜市异响', characters_present: ['顾临'], purpose: '确认回声异常', conflict: '被盯梢' },
        ],
      },
      story_state: {
        global: {
          foreshadowing_status: {
            旧案回声: '第1章埋设：回声会暴露旧案坐标',
          },
          active_threads: ['查清回声来源'],
        },
        worldbuilding: {
          world_summary: '都市表层秩序下有可触发的异常回声规则。',
          rules: ['回声只能在压迫现场触发', '每次触发都会留下可追踪代价'],
          power_system: '回声辨位，越准代价越大',
        },
        characters: [
          { name: '顾临', goal: '查清回声来源', current_state: { status: '开局' } },
        ],
      },
      writing_bible: {
        promise: '用异常回声破案并付出代价',
        world_rules: '回声规则不可无代价使用',
      },
    }
    const brief = buildChapterPreDraftBrief({ title: '夜市回声' }, contextPackage)
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toMatch(/开篇|伏笔|回声|前史/)
    expect(brief.state_tracking_contract.world_constraints.join('｜')).toMatch(/回声|规则|代价|力量/)
    expect(brief.state_tracking_contract.source_readiness.some((item: any) => item.key === 'foreshadowing_history' && item.status === 'ready')).toBe(true)
    expect(brief.state_tracking_contract.source_readiness.some((item: any) => item.key === 'world_constraints' && item.status === 'ready')).toBe(true)
    const checks = (await import('./novel-writing-service')).buildSourceReadinessPreflightChecks({
      chapter_target: {
        ...contextPackage.chapter_target,
        state_tracking_contract: brief.state_tracking_contract,
      },
    })
    expect(checks.some((item: any) => item.key === 'source_readiness_foreshadowing_history')).toBe(false)
    expect(checks.some((item: any) => item.key === 'source_readiness_world_constraints')).toBe(false)
  })

  test('flags stale story state before serial unattended continuation', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      continuity: {
        previous_chapter: {
          chapter_no: 13,
          title: '旧钥匙缺口',
          ending_hook: '旧钥匙在禁门前自己发出铜鸣。',
          ending_excerpt: '李玄刚握紧旧钥匙，林青禾就看见禁门上的旧铺印记亮了一瞬。',
        },
      },
      story_state: {
        global: {
          last_updated_chapter: 12,
          timeline: ['第12章：旧铺账册被公开。'],
        },
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄承接上一章旧钥匙自鸣，尝试打开禁门。',
        conflict: '执事逼林青禾否认上一章所见。',
        ending_hook: '禁门内站着本该失踪的旧铺掌柜。',
        scene_cards: [
          { scene_no: 1, title: '禁门前', purpose: '接住旧钥匙自鸣', conflict: '执事逼供', turning_point: '旧铺印记再亮一次' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const staleRow = brief.state_tracking_contract.source_readiness.find((item: any) => item.key === 'serial_story_state')
    const preflightChecks = buildSourceReadinessPreflightChecks({
      ...contextPackage,
      chapter_target: {
        ...contextPackage.chapter_target,
        state_tracking_contract: brief.state_tracking_contract,
      },
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          state_tracking_contract: brief.state_tracking_contract,
        },
      },
      null,
      { chapter_no: 14, title: '禁门开锁' },
    )

    expect(staleRow).toMatchObject({
      key: 'serial_story_state',
      status: 'missing',
    })
    expect(staleRow.evidence).toContain('状态机只更新到第12章')
    expect(staleRow.fix).toContain('先完成第13章状态机更新')
    expect(preflightChecks.some((item: any) => item.key === 'source_readiness_serial_story_state' && item.severity === 'high')).toBe(true)
    expect(prompt).toContain('serial_story_state')
    expect(prompt).toContain('状态机只更新到第12章')
    expect(prompt).toContain('先完成第13章状态机更新')
  })

  test('clears cached serial story state preflight once live state catches up', () => {
    const contextPackage = {
      continuity: {
        previous_chapter: {
          chapter_no: 11,
          title: '山路截杀',
          ending_hook: '截杀者带着主角熟悉却变形的知识。',
        },
      },
      story_state: {
        last_updated_chapter: 11,
        open_questions: ['截杀者是谁'],
      },
      chapter_target: {
        chapter_no: 12,
        title: '异兽交易',
        summary: '把线索变成交易筹码',
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'serial_story_state',
              label: '串行连续性/状态机',
              status: 'missing',
              evidence: '上一章第11章已进入承接链，但状态机只更新到第10章。',
              fix: '先完成第11章状态机更新，再继续第12章，避免下一章读取旧角色状态、伏笔、时间线或资产状态。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'ready',
              evidence: '江哲：已同步',
            },
          ],
        },
      },
    }

    const live = resolveSerialStoryStateReadiness(contextPackage)
    expect(live.stale).toBe(false)
    const checks = buildSourceReadinessPreflightChecks(contextPackage)
    expect(checks.some((item: any) => String(item.key || '').includes('serial_story_state'))).toBe(false)

    // still flags when live lag remains
    const stalePackage = {
      ...contextPackage,
      story_state: { last_updated_chapter: 10 },
    }
    expect(resolveSerialStoryStateReadiness(stalePackage).stale).toBe(true)
    expect(buildSourceReadinessPreflightChecks(stalePackage).some((item: any) => item.key === 'source_readiness_serial_story_state' && item.severity === 'high')).toBe(true)
  })

  test('write preparation brief drops stale serial story state once live state catches up', () => {
    const contextPackage = {
      continuity: {
        previous_chapter: {
          chapter_no: 11,
          title: '山路截杀',
          ending_hook: '截杀者带着主角熟悉却变形的知识。',
        },
      },
      story_state: {
        last_updated_chapter: 11,
      },
      chapter_target: {
        chapter_no: 12,
        title: '异兽交易',
        summary: '把线索变成交易筹码',
        goal: '把线索变成交易筹码',
        conflict: '交易对象故意缺页',
        ending_hook: '缺页资料指向更大网络',
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'serial_story_state',
              label: '串行连续性/状态机',
              status: 'missing',
              evidence: '上一章第11章已进入承接链，但状态机只更新到第10章。',
              fix: '先完成第11章状态机更新，再继续第12章。',
            },
            {
              key: 'timeline_tracking',
              label: '追踪/时间线',
              status: 'ready',
              evidence: '本章时间地点已确认',
            },
          ],
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const writePrep = brief.write_preparation_brief || {}
    expect(writePrep.readiness_status).toBe('ready')
    expect((writePrep.source_gaps || []).join('｜')).not.toContain('状态机')
    expect((writePrep.source_gaps || []).join('｜')).not.toContain('serial')
  })


  test('registers delivery risk carry-over as state tracking source material', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 15, chapter_no: 15, title: '残留复核' },
      [
        { id: 14, chapter_no: 14, title: '旧印修订' },
        { id: 15, chapter_no: 15, title: '残留复核' },
      ],
      [
        {
          id: 302,
          chapter_id: 14,
          review_type: 'prose_revision_receipt_sync',
          created_at: '2026-06-22T09:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 14,
            chapter_no: 14,
            prose_revision_receipt_sync: {
              status: 'warn',
              label: '修订回执残留 1',
              summary: '修订后仍有抽象心理描写残留。',
              missed_count: 1,
              missed: [
                {
                  label: 'S2｜prose',
                  text: '抽象心理描写没有改成动作和对白。',
                  evidence: '他心里很复杂。',
                },
              ],
              next_actions: [
                '下一章开篇必须用动作、对白和可见反应替代抽象心理描写。',
              ],
            },
          }),
        },
      ],
    )
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
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
              knowledge_scope: ['知道旧印章背面有第二个名字'],
            },
          },
        ],
      },
      setting_context: {
        required: ['旧印章'],
        entities: [
          { entity_type: 'item', name: '旧印章', summary: '背面露出第二个名字。' },
        ],
      },
      chapter_target: {
        chapter_no: 15,
        title: '残留复核',
        summary: '李玄按修订残留继续复核旧印章证词。',
        conflict: '他必须用现场动作逼出证人反应。',
        ending_hook: '第二个名字对应失踪证人。',
        scene_cards: [
          { scene_no: 1, title: '庭外复核', characters_present: ['李玄'], purpose: '接住修订残留。' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '残阵问道' }, contextPackage)
    const readiness = brief.state_tracking_contract.source_readiness.find((item: any) => item.key === 'delivery_risk_carry_over')

    expect(readiness).toMatchObject({
      key: 'delivery_risk_carry_over',
      label: '上一章诊断/修订承接',
      status: 'ready',
    })
    expect(readiness.evidence).toContain('抽象心理描写')
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toContain('下一章开篇必须用动作、对白和可见反应替代抽象心理描写')
  })

  test('carries unresolved stored oh-story delivery risk receipts into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 16, chapter_no: 16, title: '旧印追证' },
      [
        {
          id: 15,
          chapter_no: 15,
          title: '残留复核',
          raw_payload: {
            oh_story_delivery_receipts: {
              delivery_risk_receipts: [
                {
                  risk_item: '章末追读没有把旧印第二个名字压到最后一幕',
                  required_action: '下一章开篇必须用旧印第二个名字制造现场追证压力',
                  delivered: false,
                  evidence: '旧印章背面露出第二个名字。',
                  remaining_risk: '章末问题没有转成下一章可见追证动作',
                },
              ],
            },
          },
        },
        { id: 16, chapter_no: 16, title: '旧印追证' },
      ],
      [],
    )
    const brief = buildChapterPreDraftBrief({ title: '残阵问道' }, {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 16,
        title: '旧印追证',
        summary: '李玄继续追查旧印第二个名字。',
        conflict: '证人拒绝承认旧印来源。',
        ending_hook: '第二个名字对应旧案证人。',
        scene_cards: [{ scene_no: 1, title: '庭外追证', purpose: '承接旧印第二个名字。' }],
      },
    })

    expect(deliveryRiskCarryOver?.source_chapter_no).toBe(15)
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('章末追读')
    expect(deliveryRiskCarryOver?.required_actions.join('｜')).toContain('下一章开篇必须用旧印第二个名字制造现场追证压力')
    expect(deliveryRiskCarryOver?.evidence.join('｜')).toContain('章末问题没有转成下一章可见追证动作')
    expect(deliveryRiskCarryOver?.opening_actions.join('｜')).toContain('开篇承接')
    expect(deliveryRiskCarryOver?.middle_actions.join('｜')).toContain('现场追证压力')
    expect(deliveryRiskCarryOver?.ending_actions.join('｜')).toContain('章末问题没有转成下一章可见追证动作')
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toContain('下一章开篇必须用旧印第二个名字制造现场追证压力')
  })

  test('builds a delivery-risk receipt sync report from unresolved receipts', () => {
    const report = buildDeliveryRiskReceiptSyncReport(
      { title: '旧印风波' },
      { id: 16, chapter_no: 16, title: '第二个名字' },
      {
        chapter_target: {
          delivery_risk_carry_over: {
            label: '待修复 1',
            items: ['章末追读'],
            opening_actions: ['开篇必须用旧印第二个名字制造现场追证压力'],
          },
        },
        oh_story_delivery_receipts: {
          delivery_risk_receipts: [
            {
              risk_item: '章末追读',
              required_action: '开篇必须用旧印第二个名字制造现场追证压力',
              delivered: true,
              evidence: '已处理',
            },
          ],
        },
      },
      '江辰把账册证据亮在桌上，众人沉默片刻。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('交稿回执缺口 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      risk_item: '章末追读',
      required_action: '开篇必须用旧印第二个名字制造现场追证压力',
    })
    expect(report.next_actions.join('｜')).toContain('delivery_risk_receipts')
  })

  test('keeps delivery-risk receipt sync open when staged evidence lands in the wrong section', () => {
    const chapterText = [
      '李玄刚进门，林青禾只递出半枚印纹，旧印归属立刻压到桌面上。',
      '第一幕继续追认证据来源。'.repeat(40),
      '他走到阵堂深处，才让账册缺页变成执事必须改口的新证据。',
      '中段继续推进旧案边界。'.repeat(40),
      '钟声响起前，账册背页忽然浮出下一枚旧印的名字。',
    ].join('')
    const report = buildDeliveryRiskReceiptSyncReport(
      { title: '旧印风波' },
      { id: 17, chapter_no: 17, title: '错位回执' },
      {
        oh_story_delivery_receipts: {
          delivery_risk_receipts: [
            {
              risk_item: '开篇承接',
              required_action: 'opening_actions：前300字必须递出半枚印纹。',
              delivered: true,
              evidence: '他走到阵堂深处，才让账册缺页变成执事必须改口的新证据。',
              remaining_risk: '',
            },
            {
              risk_item: '中段推进',
              required_action: 'middle_actions：中段必须让账册缺页改变执事选择。',
              delivered: true,
              evidence: '李玄刚进门，林青禾只递出半枚印纹，旧印归属立刻压到桌面上。',
              remaining_risk: '',
            },
            {
              risk_item: '章末追读',
              required_action: 'ending_actions：最后300字必须浮出下一枚旧印的名字。',
              delivered: true,
              evidence: '他走到阵堂深处，才让账册缺页变成执事必须改口的新证据。',
              remaining_risk: '',
            },
          ],
        },
      },
      chapterText,
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(3)
    expect(report.missed_count).toBe(3)
    expect(report.missed.map((item: any) => item.remaining_risk).join('｜')).toContain('前300字')
    expect(report.missed.map((item: any) => item.remaining_risk).join('｜')).toContain('中段')
    expect(report.missed.map((item: any) => item.remaining_risk).join('｜')).toContain('最后300字')
  })

  test('keeps camelCase pre-draft delivery risk carry-over as state tracking source material', () => {
    const contextPackage = {
      preDraftBrief: {
        deliveryRiskCarryOver: {
          sourceChapterNo: 14,
          label: '待修复 1',
          priorityLabel: '优先修开篇承接',
          items: ['复核修订：修订残留 1'],
          requiredActions: ['下一章开篇必须用动作、对白和可见反应替代抽象心理描写。'],
          evidence: ['他心里很复杂。'],
        },
      },
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
              knowledge_scope: ['知道旧印章背面有第二个名字'],
            },
          },
        ],
      },
      setting_context: {
        required: ['旧印章'],
        entities: [
          { entity_type: 'item', name: '旧印章', summary: '背面露出第二个名字。' },
        ],
      },
      chapter_target: {
        chapter_no: 15,
        title: '残留复核',
        summary: '李玄按修订残留继续复核旧印章证词。',
        conflict: '他必须用现场动作逼出证人反应。',
        ending_hook: '第二个名字对应失踪证人。',
        scene_cards: [
          { scene_no: 1, title: '庭外复核', characters_present: ['李玄'], purpose: '接住修订残留。' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '残阵问道' }, contextPackage)
    const readiness = brief.state_tracking_contract.source_readiness.find((item: any) => item.key === 'delivery_risk_carry_over')

    expect(brief.delivery_risk_carry_over.priority_label).toBe('优先修开篇承接')
    expect(readiness).toMatchObject({
      key: 'delivery_risk_carry_over',
      label: '上一章诊断/修订承接',
      status: 'ready',
    })
    expect(readiness.evidence).toContain('抽象心理描写')
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toContain('下一章开篇必须用动作、对白和可见反应替代抽象心理描写')
  })

  test('keeps camelCase pre-draft recent fatigue brief when rebuilding the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '残阵问道' },
      {
        preDraftBrief: {
          recentFatigueBrief: {
            chapterRangeLabel: '第9-18章',
            summary: '近10章执事压迫重复过高。',
            fatigueRisks: ['执事压迫重复 7 次'],
            nextActions: ['下一章必须更换压迫来源，并补一个新的可视化场面。'],
          },
        },
        chapter_target: {
          chapter_no: 19,
          title: '旧阵异响',
          summary: '主角发现旧阵异响来自藏书阁而非阵堂。',
          conflict: '旧执事余党仍想用阵堂规矩压人，主角转向藏书阁追查。',
          ending_hook: '藏书阁地砖下传出第二道阵鸣。',
          scene_cards: [
            { scene_no: 1, title: '藏书阁转场', reader_payoff: '主角用旧阵异响反向设局。' },
          ],
        },
      },
    )

    expect(brief.recent_fatigue_brief.chapter_range_label).toBe('第9-18章')
    expect(brief.recent_fatigue_brief.fatigue_risks.join('｜')).toContain('执事压迫重复')
    expect(brief.recent_fatigue_brief.next_actions.join('｜')).toContain('更换压迫来源')
  })

  test('keeps mixed-case pre-draft governance recheck memory when rebuilding the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '残阵问道' },
      {
        pre_draft_brief: {
          governanceRecheckMemory: {
            sourceRunId: 44,
            status: 'closed',
            label: '治理复查已记录',
            summary: '恢复依据闭环 2/2，本章必须继续继承上一轮修后证据。',
            evidence: ['第42章对白交锋已补回样章节奏'],
            watchItems: ['下一章继续观察样章策略命中率'],
          },
        },
        chapter_target: {
          chapter_no: 43,
          title: '复查后的新局',
          summary: '主角用新证据逼对手公开应答。',
          conflict: '对手试图绕开上一轮修复后的对白交锋。',
          ending_hook: '旧账本出现第二个签名。',
          scene_cards: [{ title: '当堂应答', reader_payoff: '对白交锋压住旧臣。' }],
        },
      },
    )

    expect(brief.governance_recheck_memory.source_run_id).toBe(44)
    expect(brief.governance_recheck_memory.evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(brief.governance_recheck_memory.watch_items).toContain('下一章继续观察样章策略命中率')
  })

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

  test('reads camelCase preDraftBrief Step 2 contracts in paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      {
        preDraftBrief: {
          stateTrackingContract: {
            version: 'oh_story_state_tracking_v1',
            sourceReadiness: [{ key: 'previous_chapter', label: '上一章正文', status: 'ready', evidence: '旧印裂口已出现第二枚门牌。' }],
            characterStates: ['李玄左手仍握旧印，不能突然空手。'],
            historicalCausality: ['第二枚门牌来自上一章旧印裂口，必须先接住。'],
            worldConstraints: ['门牌归属只能由当场证据触发。'],
            filterRules: ['旧案旁支不影响本章判定，不进入正文解释。'],
            sourceRequirements: ['上一章结尾', '追踪/伏笔.md'],
            qualityChecks: ['只使用会影响本章正确性的状态。'],
          },
          intentConfirmationContract: {
            version: 'oh_story_intent_confirmation_v1',
            confirmedIntent: '本章只写第二枚门牌的代价归属，不扩展外门大案。',
            rhythmAndStyle: ['先压三轮，再半拍亮证据。'],
            structureInputs: ['旧印裂口 -> 执事索印 -> 门牌显名'],
            executionFocus: ['爽点出手前先铺可指认危机。'],
            dialogueToneBaseline: ['高压场景里配角不能轻快插科打诨。'],
            qualityChecks: ['必须证明意图确认已落正文。'],
          },
          benchmarkRecallBrief: {
            version: 'oh_story_benchmark_recall_v1',
            selectedEmotionModule: 'M03 信息差反杀',
            rhythmReference: '三轮压问后半拍亮证据',
            styleProfileSummary: '短句推进审讯压力，对白留半拍。',
            matchedChapterTechniques: ['证据晚半拍亮出'],
            styleDirectives: ['动作压对白'],
            canonicalSourceRules: ['文风.md 只管表达层'],
            gaps: ['matched_deep_dive_missing'],
            qualityChecks: ['不得复制对标桥段。'],
          },
          styleBoundaryContract: {
            version: 'oh_story_style_boundary_v1',
            styleOverrideRules: ['只调整句长、停顿和对白比例。'],
            hardConstraints: ['硬约束永远赢。'],
            copyBoundaryRules: ['不得复制样章桥段。'],
            qualityChecks: ['检查文风覆盖边界。'],
          },
        },
        chapter_target: {
          chapter_no: 22,
          title: '第二枚门牌',
          summary: '李玄用第二枚门牌逼出归属代价。',
          conflict: '执事要夺走旧印。',
          ending_hook: '第二枚门牌背面出现母亲旧名。',
          scene_cards: [
            { scene_no: 1, title: '旧印裂口', purpose: '承接第二枚门牌。', conflict: '执事索印。' },
          ],
        },
      },
      null,
      { chapter_no: 22, title: '第二枚门牌' },
    )

    expect(prompt).toContain('【状态筛选合同】')
    expect(prompt).toContain('旧印裂口已出现第二枚门牌')
    expect(prompt).toContain('李玄左手仍握旧印')
    expect(prompt).toContain('旧案旁支不影响本章判定')
    expect(prompt).toContain('【意图确认合同】')
    expect(prompt).toContain('本章只写第二枚门牌的代价归属')
    expect(prompt).toContain('先压三轮，再半拍亮证据')
    expect(prompt).toContain('【文风召回简报】')
    expect(prompt).toContain('M03 信息差反杀')
    expect(prompt).toContain('三轮压问后半拍亮证据')
    expect(prompt).toContain('【文风覆盖边界合同】')
    expect(prompt).toContain('只调整句长、停顿和对白比例')
    expect(prompt).toContain('硬约束永远赢')
    expect(prompt).toContain('不得复制样章桥段')
  })

  test('turns oh-story daily workflow into explicit prose execution gates', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 21,
        title: '门牌追问',
        summary: '李玄只追问会影响门牌归属判定的状态，用旧印逼执事露出规则漏洞。',
        conflict: '执事试图用无关旧案分散注意力。',
        state_tracking_contract: {
          version: 'oh_story_state_tracking_v1',
          character_states: ['李玄左手持有旧印，不能突然空手。'],
          historical_causality: ['门牌翻面后会改写归属判定。'],
          world_constraints: ['归属判定只能由当场证据触发。'],
          filter_rules: ['旧案旁支不影响本章判定，不进入正文解释。'],
          quality_checks: ['只使用会影响本章正确性的状态。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧印追问',
            goal: '逼执事承认门牌归属判定条件。',
            conflict: '执事抛出旧案旁支转移焦点。',
            turning_point: '旧印烫出当前归属人姓名。',
            reader_payoff: '李玄用当场证据反制执事。',
          },
        ],
      },
    }

    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      contextPackage,
      null,
      { chapter_no: 21, title: '门牌追问' },
    )

    expect(prompt).toContain('oh-story 日更工作流')
    expect(prompt).toContain('状态筛选')
    expect(prompt).toContain('只加载/只使用会影响本章正确性的状态')
    expect(prompt).toContain('不知道就会写错')
    expect(prompt).toContain('status_filter_receipts')
    expect(prompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks')
    expect(prompt).toContain('场景执行门禁')
    expect(prompt).toContain('goal -> obstacle -> action -> turn -> payoff -> state_delta')
    expect(prompt).toContain('turning_point')
    expect(prompt).toContain('reader_payoff')
    expect(prompt).toContain('scene_card_receipts')
  })

  test('keeps matched chapter source paths in benchmark recall brief and prose prompt', () => {
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
        style_sample_strategy: {
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_path: '对标/旧城诡案/文风.md',
          module_source_path: '对标/旧城诡案/剧情/情绪模块.md',
          rhythm_source_path: '对标/旧城诡案/剧情/节奏.md',
          benchmark_recall: {
            matched_chapter_summary_path: '对标/旧城诡案/章节/第12章_摘要.md',
            matched_chapter_deep_dive_path: '对标/旧城诡案/章节/第12章_深度拆解.md',
          },
        },
        chapter_benchmark_strategy: {
          benchmark_recall: {
            matched_chapter_K: '第12章_雨巷审讯',
            fallback_deep_dive_path: '对标/旧城诡案/章节/第1-3章_深度拆解.md',
          },
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:01:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief.source_paths).toEqual(expect.arrayContaining([
      '对标/旧城诡案/文风.md',
      '对标/旧城诡案/剧情/情绪模块.md',
      '对标/旧城诡案/剧情/节奏.md',
      '对标/旧城诡案/章节/第12章_摘要.md',
      '对标/旧城诡案/章节/第12章_深度拆解.md',
      '对标/旧城诡案/章节/第1-3章_深度拆解.md',
    ]))
    expect(brief.benchmark_recall_brief.style_profile_path).toBe('对标/旧城诡案/文风.md')
    expect(brief.benchmark_recall_brief.module_source_path).toBe('对标/旧城诡案/剧情/情绪模块.md')
    expect(brief.benchmark_recall_brief.rhythm_source_path).toBe('对标/旧城诡案/剧情/节奏.md')
    expect(brief.benchmark_recall_brief.matched_chapter_summary_path).toBe('对标/旧城诡案/章节/第12章_摘要.md')
    expect(brief.benchmark_recall_brief.matched_chapter_deep_dive_path).toBe('对标/旧城诡案/章节/第12章_深度拆解.md')
    expect(brief.benchmark_recall_brief.fallback_deep_dive_path).toBe('对标/旧城诡案/章节/第1-3章_深度拆解.md')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('剧情/情绪模块.md')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('剧情/节奏.md')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('文风.md 只管表达层')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('冲突时以情绪模块/节奏为准')
    expect(prompt).toContain('source_paths：对标/旧城诡案/文风.md')
    expect(prompt).toContain('style_profile_path：对标/旧城诡案/文风.md')
    expect(prompt).toContain('module_source_path：对标/旧城诡案/剧情/情绪模块.md')
    expect(prompt).toContain('rhythm_source_path：对标/旧城诡案/剧情/节奏.md')
    expect(prompt).toContain('matched_chapter_summary_path：对标/旧城诡案/章节/第12章_摘要.md')
    expect(prompt).toContain('matched_chapter_deep_dive_path：对标/旧城诡案/章节/第12章_深度拆解.md')
    expect(prompt).toContain('fallback_deep_dive_path：对标/旧城诡案/章节/第1-3章_深度拆解.md')
    expect(prompt).toContain('canonical_source_rules')
    expect(prompt).toContain('文风.md 只管表达层')
    expect(prompt).toContain('冲突时以情绪模块/节奏为准')
    expect(prompt).toContain('对标/旧城诡案/章节/第12章_摘要.md')
    expect(prompt).toContain('对标/旧城诡案/章节/第12章_深度拆解.md')
    expect(prompt).toContain('对标/旧城诡案/章节/第1-3章_深度拆解.md')
  })

  test('keeps secondary benchmark recall as structure-only context and blocks style contamination', () => {
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
          source_paths: [
            '对标/旧城诡案/文风.md',
            '对标/旧城诡案/章节/第12章_深度拆解.md',
          ],
          secondary_benchmark_recall_summary: [
            {
              book_title: '副书A',
              citation_strength: '辅',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 2,
              usage: '只参考证据链分批释放结构，不进入文风/原文锚点。',
            },
            {
              book_title: '副书B',
              citation_strength: '参考',
              relevance: '弱相关',
              recall_stage: '设定',
              recall_count: 1,
              usage: '只参考协会层级压迫，不读取副书文风.md。',
            },
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:02:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(brief.benchmark_recall_brief.secondary_benchmark_recall_summary).toHaveLength(2)
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('副对标只用于结构/情绪/设定参考')
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('副书不进文风')
    expect(prompt).toContain('副对标召回摘要')
    expect(prompt).toContain('副书A')
    expect(prompt).toContain('只参考证据链分批释放结构')
    expect(prompt).toContain('副书不进文风、不进原文锚点')
    expect(prompt).toContain('secondary_benchmark_boundary')
    expect(prompt).toContain('主对标最多 1 本用于文风和原文锚点')
    expect(reviewPromptBlock).toContain('副对标召回摘要')
    expect(reviewPromptBlock).toContain('副书文风污染')
  })

  test('orders secondary benchmark recall by oh-story relevance and trims entries within stage budget', () => {
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
          secondary_benchmark_total_budget: 5,
          benchmark_registry_missing: true,
          secondary_benchmark_recall_summary: [
            {
              book_title: '副弱书',
              citation_strength: '参考',
              relevance: '弱相关',
              recall_stage: '设定',
              recall_count: 2,
              usage: '只参考组织层级，不进入文风。',
            },
            {
              book_title: '副同题材辅书',
              citation_strength: '辅',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 4,
              registry_order: 2,
              usage: '只参考证据链分批释放结构。',
            },
            {
              book_title: '副同题材参考书',
              citation_strength: '参考',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 3,
              registry_order: 1,
              usage: '只参考章节钩子组合。',
            },
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:02:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const rows = brief.benchmark_recall_brief.secondary_benchmark_recall_summary

    expect(rows.map((row: any) => row.book_title)).toEqual(['副同题材辅书', '副同题材参考书', '副弱书'])
    expect(rows.reduce((sum: number, row: any) => sum + Number(row.recall_count || 0), 0)).toBe(5)
    expect(rows[1].budget_trimmed).toBe(true)
    expect(rows[1].recall_count).toBe(1)
    expect(rows[2].recall_count).toBe(0)
    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('benchmark_registry_missing')
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('同题材 > 弱相关 > 参考')
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('裁剪召回条目，不删除书目记录')
    expect(prompt).toContain('副同题材辅书')
    expect(prompt.indexOf('副同题材辅书')).toBeLessThan(prompt.indexOf('副同题材参考书'))
    expect(prompt).toContain('benchmark_registry_missing')
    expect(prompt).toContain('裁剪召回条目，不删除书目记录')
  })

  test('carries secondary benchmark boundaries into write preparation checks', () => {
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
          gaps: ['gaps.main_benchmark_unspecified: true'],
          benchmark_registry_missing: true,
          secondary_benchmark_recall_summary: [
            {
              book_title: '副书A',
              citation_strength: '辅',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 2,
              usage: '只参考证据链分批释放结构，不进入文风/原文锚点。',
            },
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-28T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const writePreparationBrief = brief.write_preparation_brief

    expect(writePreparationBrief.readiness_status).toBe('needs_context')
    expect(writePreparationBrief.source_gaps.join('｜')).toContain('benchmark_registry_missing')
    expect(writePreparationBrief.source_gaps.join('｜')).toContain('main_benchmark_unspecified')
    expect(writePreparationBrief.must_confirm.join('｜')).toContain('主对标最多 1 本')
    expect(writePreparationBrief.must_confirm.join('｜')).toContain('副书不进文风、不进原文锚点')
    expect(writePreparationBrief.execution_order.join('｜')).toContain('secondary_benchmark_boundary')
    expect(prompt).toContain('文风召回：benchmark_registry_missing')
    expect(prompt).toContain('benchmark_registry_missing')
    expect(prompt).toContain('写前必确认')
    expect(prompt).toContain('副书不进文风、不进原文锚点')
    expect(prompt).toContain('文风召回缺口和副对标边界')
    expect(prompt.indexOf('benchmark_registry_missing')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('asks prose generation to output intent confirmation and benchmark recall execution receipts', () => {
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
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          anchor_excerpts: ['原文锚点只学半拍亮证据的停顿，不进入正文。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨夜审讯',
            purpose: '让执事连续压问，制造证词被抢占的压力。',
            conflict: '李玄必须在证词被定性前找到反证入口。',
            reader_payoff: '证据反杀，执事失态。',
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

    expect(prompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks')
    expect(prompt).toContain('confirmed_intent')
    expect(prompt).toContain('rhythm_and_style')
    expect(prompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks')
    expect(prompt).toContain('selected_emotion_module')
    expect(prompt).toContain('matched_chapter_techniques')
    expect(prompt).toContain('style_directives、anchor_excerpts、canonical_source_rules')
    expect(prompt).toContain('未完成时 delivered=false')
  })

  test('adds oh-story benchmark fallback receipt requirements to pre-draft brief and prose prompt', () => {
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
        style_sample_strategy: {
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_K: '第12章_雨巷审讯',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          module_source_path: '对标/旧城诡案/剧情/情绪模块.md',
          rhythm_source_path: '对标/旧城诡案/剧情/节奏.md',
          style_profile_path: '对标/旧城诡案/文风.md',
          benchmark_recall: {
            matched_chapter_summary_path: '对标/旧城诡案/章节/第12章_摘要.md',
            fallback_deep_dive_path: '对标/旧城诡案/章节/第1-3章_深度拆解.md',
          },
          gaps: ['legacy_deconstruction', 'matched_deep_dive_missing'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨夜审讯',
            purpose: '让执事连续压问，制造证词被抢占的压力。',
            conflict: '李玄必须在证词被定性前找到反证入口。',
            reader_payoff: '证据反杀，执事失态。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-28T13:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const fallbackRequirements = brief.benchmark_recall_brief.fallback_receipt_requirements.join('｜')

    expect(fallbackRequirements).toContain('module_usage_receipt')
    expect(fallbackRequirements).toContain('source_type=emotion_module')
    expect(fallbackRequirements).toContain('对标/旧城诡案/剧情/情绪模块.md')
    expect(fallbackRequirements).toContain('rhythm_usage_receipt')
    expect(fallbackRequirements).toContain('source_type=rhythm')
    expect(fallbackRequirements).toContain('对标/旧城诡案/剧情/节奏.md')
    expect(fallbackRequirements).toContain('matched_chapter_usage_receipt')
    expect(fallbackRequirements).toContain('source_type=matched_chapter')
    expect(fallbackRequirements).toContain('对标/旧城诡案/章节/第12章_摘要.md')
    expect(fallbackRequirements).toContain('gaps_preserved')
    expect(prompt).toContain('fallback_receipt_requirements')
    expect(prompt).toContain('module_usage_receipt')
    expect(prompt).toContain('rhythm_usage_receipt')
    expect(prompt).toContain('matched_chapter_usage_receipt')
    expect(prompt).toContain('fallback_usage_receipts')
    expect(prompt).toContain('source_type/source_path/expected_application/delivered_evidence/gaps_preserved')
  })

  test('injects mixed-case pre-draft benchmark recall brief into prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师', reference_config: {} },
      {
        pre_draft_brief: {
          benchmarkRecallBrief: {
            selectedEmotionModule: 'M03 信息差反杀',
            rhythmReference: '先压三轮，再半拍亮证据',
            styleProfileSummary: '短句推进，章尾只留未解问题',
            matchedChapter: '第12章_雨巷审讯',
            matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
            styleDirectives: ['爆发后短冷却，不提前解释动机'],
            gaps: ['matched_deep_dive_missing'],
          },
          styleBoundaryContract: {
            hardConstraints: ['硬约束永远赢', 'Gate F 章末禁升华'],
            copyBoundaryRules: ['不得复制样章桥段'],
            qualityChecks: ['文风召回不能覆盖剧情事实。'],
          },
        },
        chapter_target: {
          chapter_no: 18,
          title: '雨夜反证',
          summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
          conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
          ending_hook: '旧账册缺页露出内门印记。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const recallStart = prompt.indexOf('【文风召回简报】')
    const recallEnd = prompt.indexOf('【文风覆盖边界合同】') >= 0
      ? prompt.indexOf('【文风覆盖边界合同】')
      : prompt.indexOf('【结构化上下文包】')
    const recallSection = prompt.slice(recallStart, recallEnd)

    expect(recallStart).toBeGreaterThanOrEqual(0)
    expect(recallSection).toContain('selected_emotion_module：M03 信息差反杀')
    expect(recallSection).toContain('rhythm_reference：先压三轮，再半拍亮证据')
    expect(recallSection).toContain('style_profile_summary：短句推进，章尾只留未解问题')
    expect(recallSection).toContain('matched_chapter：第12章_雨巷审讯')
    expect(recallSection).toContain('matched_chapter_techniques：三轮压问；半拍亮证据')
    expect(recallSection).toContain('爆发后短冷却')
    expect(recallSection).toContain('matched_deep_dive_missing')
  })

  test('drops matched chapter inputs when benchmark tone matching failed', () => {
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
        style_sample_strategy: {
          style_profile_summary: '整书文风：短句推进审讯压力，对白留半拍。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_K: '第99章_轻松日常',
          matched_chapter_techniques: ['轻松吐槽', '日常慢铺'],
          gaps: {
            tone_match_failed: true,
          },
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:05:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const recallSection = prompt.slice(
      prompt.indexOf('【文风召回简报】'),
      prompt.indexOf('【结构化上下文包】'),
    )

    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('tone_match_failed')
    expect(brief.benchmark_recall_brief.style_profile_summary).toContain('整书文风')
    expect(brief.benchmark_recall_brief.matched_chapter).toBe('')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques).toEqual([])
    expect(brief.intent_confirmation_contract.confirmed_intent).not.toContain('轻松吐槽')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).not.toContain('日常慢铺')
    expect(recallSection).toContain('tone_match_failed')
    expect(recallSection).toContain('整书文风')
    expect(recallSection).not.toContain('第99章_轻松日常')
    expect(recallSection).not.toContain('轻松吐槽')
    expect(prompt).not.toContain('轻松吐槽')
    expect(prompt).not.toContain('日常慢铺')
  })

  test('drops unusable style profile when benchmark profile is degenerate', () => {
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
        style_sample_strategy: {
          style_profile_summary: '退化文风画像：空泛形容词堆叠，无法指导正文。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_K: '第12章_雨巷审讯',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          style_directives: ['照退化画像写空泛冷调'],
          gaps: {
            profile_degenerate: true,
          },
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:06:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const recallSection = prompt.slice(
      prompt.indexOf('【文风召回简报】'),
      prompt.indexOf('【结构化上下文包】'),
    )

    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('profile_degenerate')
    expect(brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(brief.benchmark_recall_brief.rhythm_reference).toContain('先压三轮')
    expect(brief.benchmark_recall_brief.style_profile_summary).toBe('')
    expect(brief.benchmark_recall_brief.matched_chapter).toBe('')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques).toEqual([])
    expect(brief.benchmark_recall_brief.style_directives).toEqual([])
    expect(brief.intent_confirmation_contract.confirmed_intent).not.toContain('照退化画像')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).not.toContain('照退化画像')
    expect(recallSection).toContain('profile_degenerate')
    expect(recallSection).not.toContain('退化文风画像')
    expect(recallSection).not.toContain('第12章_雨巷审讯')
    expect(recallSection).not.toContain('照退化画像')
    expect(prompt).not.toContain('照退化画像')
  })

  test('skips benchmark recall when no benchmark project is configured', () => {
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
        style_sample_strategy: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          gaps: {
            no_benchmark: true,
          },
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:07:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief).toBeNull()
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('无对标参考')
    expect(prompt).not.toContain('【文风召回简报】')
    expect(prompt).not.toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks')
    expect(prompt).toContain('无对标参考')
  })

  test('turns benchmark module rhythm conflicts into authority rules for pre-draft and prose prompt', () => {
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
          style_profile_summary: '文风摘要建议冷静旁观，低情绪慢铺陈。',
          selected_emotion_module: 'M03 信息差反杀：压迫后必须强爽感释放。',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          gaps: {
            conflict: '文风摘要偏冷，情绪模块要求更强爽感释放',
            module_rhythm_conflict: true,
          },
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨夜审讯',
            purpose: '让执事连续压问，制造证词被抢占的压力。',
            conflict: '李玄必须在证词被定性前找到反证入口。',
            reader_payoff: '证据反杀，执事失态。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:10:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief.authority_rules.join('｜')).toContain('情绪模块/节奏参照优先')
    expect(brief.benchmark_recall_brief.authority_rules.join('｜')).toContain('文风只管表达')
    expect(brief.benchmark_recall_brief.conflict_resolution).toContain('文风摘要偏冷')
    expect(confirmedContext.chapter_target.benchmark_recall_brief.authority_rules.join('｜')).toContain('selected_emotion_module')
    expect(prompt).toContain('benchmark_authority_rules')
    expect(prompt).toContain('情绪模块/节奏参照优先')
    expect(prompt).toContain('文风只管表达')
    expect(prompt).toContain('文风摘要偏冷')
  })

  test('hydrates incomplete explicit benchmark recall from style strategy', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 19,
        title: '雨巷旧证',
        summary: '李玄用雨巷旧证逼执事露出换证破绽。',
        conflict: '执事连续压问，旁观弟子开始倒向他。',
        benchmark_recall_brief: {
          version: 'oh_story_benchmark_recall_v1',
          source: 'manual_incomplete',
          quality_checks: ['文风召回必须落到正文动作。'],
        },
        style_sample_strategy: {
          style_profile_summary: '短句推进审讯压力，对白留半拍，动作句只保留能改变信息差的细节。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          gaps: {
            matched_deep_dive_missing: true,
          },
        },
        chapter_benchmark_strategy: {
          benchmark_recall: {
            matched_chapter_K: '第12章_雨巷审讯',
          },
          style_directives: ['章末只留未解问题'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨巷压问',
            purpose: '执事压住证词解释权。',
            conflict: '李玄必须在证词被定性前找到旧证入口。',
            reader_payoff: '证据反杀，执事失态。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)

    expect(brief.benchmark_recall_brief.source).toBe('manual_incomplete')
    expect(brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(brief.benchmark_recall_brief.rhythm_reference).toContain('先压三轮')
    expect(brief.benchmark_recall_brief.style_profile_summary).toContain('短句推进')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques).toContain('三轮压问')
    expect(brief.benchmark_recall_brief.matched_chapter).toContain('第12章')
    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('matched_deep_dive_missing')
    expect(brief.benchmark_recall_brief.quality_checks).toEqual(['文风召回必须落到正文动作。'])
  })

  test('derives benchmark recall from hydrated chapter benchmark samples', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 20,
        title: '门槛旧证',
        summary: '李玄用门槛旧证把执事逼出破绽。',
        conflict: '执事抢先定义证词，旁观弟子开始倒向他。',
        chapter_benchmark_strategy: {
          enabled: true,
        },
      },
    }
    const project = {
      title: '旧城维修师',
      genre: '规则怪谈',
      reference_config: {
        chapter_benchmark_sample_bank: [
          {
            sample_key: '规则审讯第一夜',
            genre: '规则怪谈',
            opening_hook: '开篇 300 字内抛出门槛禁令和证词反常点',
            conflict_pattern: '三轮压问后半拍亮证据',
            payoff_pattern: '证据反杀，旁观者立场翻转',
            ending_hook_pattern: '章末只留未解问题，不解释幕后动机',
            abstract_usage: '学习三轮压问、半拍亮证据、旁观者差异化反应的章节节奏。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.chapter_benchmark_strategy.samples.map((sample: any) => sample.sample_key)).toEqual(['规则审讯第一夜'])
    expect(brief.benchmark_recall_brief.matched_chapter).toContain('规则审讯第一夜')
    expect(brief.benchmark_recall_brief.style_profile_summary).toContain('三轮压问')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques.join('｜')).toContain('半拍亮证据')
    expect(brief.benchmark_recall_brief.style_directives.join('｜')).toContain('章末只留未解问题')
  })

  test('wires benchmark recall checks into prose self-review and revision', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse ='),
      source.indexOf('const runProseSelfReviewAndRevision ='),
    )
    const normalizedReviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )
    const reviewNormalizeSetupBlock = source.slice(
      source.indexOf('const preDraftReceiptChecks ='),
      source.indexOf('const normalizedReview = {', source.indexOf('const preDraftReceiptChecks =')),
    )

    expect(reviewPromptBlock).toContain('chapter_target.benchmark_recall_brief')
    expect(reviewPromptBlock).toContain('benchmark_recall_checks')
    expect(reviewPromptBlock).toContain('source_type')
    expect(reviewPromptBlock).toContain('expected_application')
    expect(reviewPromptBlock).toContain('gaps_preserved')
    expect(reviewPromptBlock).toContain('canonical_source_rules')
    expect(reviewPromptBlock).toContain('文风.md 只管表达层')
    expect(revisionPromptBlock).toContain('benchmark_recall_checks')
    expect(revisionPromptBlock).toContain('情绪模块/节奏为准')
    expect(shouldReviseBlock).toContain('benchmark_recall_checks')
    expect(normalizedReviewBlock).toContain('benchmark_recall_checks')
    expect(reviewNormalizeSetupBlock).toContain('preDraftExecutionReceiptSections(reviewPayload)')
    expect(normalizedReviewBlock).toContain('section?.benchmark_recall_checks || section?.benchmarkRecallChecks')
  })

  test('asks prose self review and revision to enforce reader retention Hook addiction checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse ='),
      source.indexOf('const runProseSelfReviewAndRevision ='),
    )
    const normalizedReviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )

    expect(reviewPromptBlock).toContain('chapter_target.reader_retention_brief')
    expect(reviewPromptBlock).toContain('reader_retention_checks')
    expect(reviewPromptBlock).toContain('retention_engine')
    expect(reviewPromptBlock).toContain('emotional_payoff')
    expect(reviewPromptBlock).toContain('information_hunger')
    expect(reviewPromptBlock).toContain('page_turn_question')
    expect(reviewPromptBlock).toContain('Hook上瘾模型')
    expect(reviewPromptBlock).toContain('触发 -> 行动 -> 奖励 -> 投入')
    expect(reviewPromptBlock).toContain('留存四大支柱')
    expect(reviewPromptBlock).toContain('升级、资源困境、目标、解密')
    expect(revisionPromptBlock).toContain('reader_retention_checks')
    expect(revisionPromptBlock).toContain('奖励随机性')
    expect(revisionPromptBlock).toContain('留存四大支柱')
    expect(shouldReviseBlock).toContain('reader_retention_checks')
    expect(normalizedReviewBlock).toContain('reader_retention_checks')
    expect(normalizedReviewBlock).toContain('reviewPayload?.reader_retention_checks')
  })

  test('asks prose self review and revision to enforce oh-story style boundary checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse ='),
      source.indexOf('const runProseSelfReviewAndRevision ='),
    )
    const normalizedReviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )

    expect(reviewPromptBlock).toContain('chapter_target.style_boundary_contract')
    expect(reviewPromptBlock).toContain('style_boundary_checks')
    expect(reviewPromptBlock).toContain('硬约束永远赢')
    expect(reviewPromptBlock).toContain('Gate F')
    expect(revisionPromptBlock).toContain('style_boundary_checks')
    expect(revisionPromptBlock).toContain('文风覆盖边界')
    expect(revisionPromptBlock).toContain('删掉任何为了模仿文风而引入的禁用词')
    expect(shouldReviseBlock).toContain('style_boundary_checks')
    expect(normalizedReviewBlock).toContain('style_boundary_checks')
    expect(normalizedReviewBlock).toContain('reviewPayload?.style_boundary_checks')
  })

  test('asks prose self review and revision to enforce style sample strategy checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse ='),
      source.indexOf('const runProseSelfReviewAndRevision ='),
    )
    const normalizedReviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )

    expect(reviewPromptBlock).toContain('chapter_target.style_sample_strategy')
    expect(reviewPromptBlock).toContain('style_sample_checks')
    expect(reviewPromptBlock).toContain('style_dimension')
    expect(reviewPromptBlock).toContain('source_technique')
    expect(reviewPromptBlock).toContain('adapted_evidence')
    expect(reviewPromptBlock).toContain('copied_phrase_rewritten')
    expect(reviewPromptBlock).toContain('适用场景、避用场景和复制边界')
    expect(reviewPromptBlock).toContain('只学习叙述节奏、句式密度、对白比例和情绪转折')
    expect(revisionPromptBlock).toContain('style_sample_checks')
    expect(revisionPromptBlock).toContain('样章策略')
    expect(revisionPromptBlock).toContain('不得复制样章桥段、专有设定、角色名、核心梗或原句')
    expect(shouldReviseBlock).toContain('style_sample_checks')
    expect(normalizedReviewBlock).toContain('style_sample_checks')
    expect(normalizedReviewBlock).toContain('reviewPayload?.style_sample_checks')
  })

  test('asks prose revision to preserve core direction and only repair evidenced findings', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const monofileSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const prosePromptSource = readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8')
    const prosePromptBlock = prosePromptSource.slice(
      prosePromptSource.indexOf('export function buildCoreContractRadarPromptSection'),
    )
    const prosePromptCallBlock = monofileSource.slice(
      monofileSource.indexOf('...buildLongformCompassPromptSection(longformCompass)'),
      monofileSource.indexOf("nextBatchBrief ? '【本批连载任务书】'"),
    )
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('const shouldReviseProse ='),
    )

    expect(prosePromptCallBlock).toContain('buildCoreContractRadarPromptSection(coreContractRadar)')
    expect(prosePromptBlock).toContain('主题统一')
    expect(prosePromptBlock).toContain('全书核心情绪')
    expect(prosePromptBlock).toContain('小情绪服从大情绪')
    expect(prosePromptBlock).toContain('卖点四步法')
    expect(prosePromptBlock).toContain('发现比告知爽十倍')
    expect(prosePromptBlock).toContain('重复策略')
    expect(prosePromptBlock).toContain('节奏自检')
    expect(prosePromptBlock).toContain('金手指结构')
    expect(prosePromptBlock).toContain('开篇压力')
    expect(reviewPromptBlock).toContain('主题统一')
    expect(reviewPromptBlock).toContain('随机翻开一章')
    expect(reviewPromptBlock).toContain('core_contract_radar')
    expect(reviewPromptBlock).toContain('卖点四步法')
    expect(reviewPromptBlock).toContain('同一卖点至少延展')
    expect(reviewPromptBlock).toContain('连续 2 章没有目标推进')
    expect(reviewPromptBlock).toContain('金手指可替换故事流程')
    expect(reviewPromptBlock).toContain('300-500字内交代处境、危险来源和破局希望')
    expect(revisionPromptBlock).toContain('修订守恒')
    expect(revisionPromptBlock).toContain('不得新增支线')
    expect(revisionPromptBlock).toContain('不改长期方向')
    expect(revisionPromptBlock).toContain('只修自检证据')
    expect(revisionPromptBlock).toContain('core_contract_radar')
    expect(revisionPromptBlock).toContain('chapter_core_drift')
    expect(revisionPromptBlock).toContain('主题统一')
    expect(revisionPromptBlock).toContain('全书核心情绪')
    expect(revisionPromptBlock).toContain('卖点四步法')
    expect(revisionPromptBlock).toContain('重复策略')
    expect(revisionPromptBlock).toContain('节奏自检')
    expect(revisionPromptBlock).toContain('金手指结构')
  })

  test('asks prose self review and revision to enforce ten-chapter core selling point drift checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )

    expect(reviewPromptBlock).toContain('periodic_drift_check')
    expect(reviewPromptBlock).toContain('当初吸引读者的卖点还在吗')
    expect(reviewPromptBlock).toContain('十章卖点复核')
    expect(revisionPromptBlock).toContain('ten_chapter_selling_point')
    expect(revisionPromptBlock).toContain('核心卖点被稀释或替换')
  })

  test('detects benchmark recall techniques that are mentioned but not executed in prose', () => {
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出', '旁观者差异化反应'],
        },
      },
    }
    const checks = scanBenchmarkRecallExecutionRisks(contextPackage, [
      '李玄拿出旧印章，直接证明执事换证。',
      '所有旁观弟子都震惊了。',
      '执事很生气，事情进入下一阶段。',
    ].join('\n'))

    expect(checks.length).toBeGreaterThan(0)
    expect(checks[0].key).toContain('benchmark_recall_')
    expect(checks[0].label).toBe('文风召回执行扫描')
    expect(checks.map((item: any) => item.evidence).join('｜')).toContain('匹配章技法')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('matched_chapter_techniques')
  })

  test('does not flag benchmark recall when rhythm and matched techniques are visible', () => {
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出', '旁观者差异化反应'],
        },
      },
    }
    const checks = scanBenchmarkRecallExecutionRisks(contextPackage, [
      '执事第一轮压问旧账册从哪里来，李玄没有急着答。',
      '第二轮，他逼林青禾改口；第三轮，他把旁观弟子也压进证词里。',
      '李玄等他话音落尽，才晚半拍亮出旧印章。证据爆发的瞬间，执事脸色第一次失控。',
      '旁观弟子分成三拨：有人怀疑，有人倒戈，有人沉默退后。',
      '短暂冷却后，旧印章背面露出第二个证人的名字，章尾钩子压住没有解释。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic benchmark recall risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )

    expect(reviewBlock).toContain('const deterministicBenchmarkRecallChecks = scanBenchmarkRecallExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicBenchmarkRecallChecks')
  })

  test('adds an oh-story information flow contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        title: '伪证裂口',
        summary: '主角先识破伪证，再用旧印章反推出幕后换账本的人。',
        conflict: '对手试图用反派背景解释拖住审判节奏。',
        ending_hook: '旧印章背面刻着第二个证人的名字。',
        scene_cards: [
          {
            scene_no: 1,
            title: '识破伪证',
            purpose: '让主角发现账本墨迹时间不对。',
            required_information: ['账本是新墨伪造', '执事昨夜接触过账本'],
            information_gap: '谁在昨夜换走真账本。',
            reader_payoff: '主角识破骗局。',
            ending_hook_seed: '伪证背面有旧印章。',
          },
          {
            scene_no: 2,
            title: '旧印章反推',
            purpose: '用旧印章把伪证线推进到幕后证人。',
            required_information: ['旧印章属于三年前的证人', '证人还活着'],
            information_gap: '证人为什么躲在审判庭附近。',
            reader_payoff: '旧印章回应上一场悬念。',
            reversal: '旧印章不是物证，而是求救信号。',
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
      { chapter_no: 13, title: '伪证裂口' },
    )

    expect(brief.information_flow_contract.version).toBe('oh_story_information_flow_v1')
    expect(brief.information_flow_contract.information_units.join('｜')).toContain('主角识破骗局')
    expect(brief.information_flow_contract.information_units.join('｜')).toContain('旧印章回应上一场悬念')
    expect(brief.information_flow_contract.progression_chain.join('｜')).toContain('识破伪证')
    expect(brief.information_flow_contract.progression_chain.join('｜')).toContain('旧印章反推')
    expect(brief.information_flow_contract.transition_rules.join('｜')).toContain('前一个场景留下悬念')
    expect(brief.information_flow_contract.transition_compression_rules.join('｜')).toContain('过渡不是填充')
    expect(brief.information_flow_contract.transition_compression_rules.join('｜')).toContain('没有信息量就删掉')
    expect(brief.information_flow_contract.next_objective_rules.join('｜')).toContain('每次实力、身份、资源或阶段性目标提升后')
    expect(brief.information_flow_contract.water_risk_guards.join('｜')).toContain('反派背景')
    expect(confirmedContext.chapter_target.information_flow_contract.quality_checks.join('｜')).toContain('信息团')
    expect(prompt).toContain('【信息团与场景衔接合同】')
    expect(prompt).toContain('执行 chapter_target.information_flow_contract')
    expect(prompt).toContain('每个信息团必须能一句话概括')
    expect(prompt).toContain('过渡压缩')
    expect(prompt).toContain('过渡不是填充')
    expect(prompt).toContain('提升后下一目标')
    expect(prompt).toContain('每次实力、身份、资源或阶段性目标提升后')
    expect(prompt).toContain('information_flow_checks')
    expect(prompt.indexOf('【信息团与场景衔接合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit information flow contract from scene cards', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        title: '伪证裂口',
        summary: '主角先识破伪证，再用旧印章反推出幕后换账本的人。',
        conflict: '对手试图用反派背景解释拖住审判节奏。',
        information_flow_contract: {
          version: 'oh_story_information_flow_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须确认每个场景都有信息团。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '识破伪证',
            purpose: '让主角发现账本墨迹时间不对。',
            required_information: ['账本是新墨伪造', '执事昨夜接触过账本'],
            information_gap: '谁在昨夜换走真账本。',
            reader_payoff: '主角识破骗局。',
            ending_hook_seed: '伪证背面有旧印章。',
          },
          {
            scene_no: 2,
            title: '旧印章反推',
            purpose: '用旧印章把伪证线推进到幕后证人。',
            required_information: ['旧印章属于三年前的证人', '证人还活着'],
            information_gap: '证人为什么躲在审判庭附近。',
            reader_payoff: '旧印章回应上一场悬念。',
            reversal: '旧印章不是物证，而是求救信号。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)

    expect(brief.information_flow_contract.source).toBe('manual_incomplete')
    expect(brief.information_flow_contract.quality_checks).toEqual(['必须确认每个场景都有信息团。'])
    expect(brief.information_flow_contract.information_units.join('｜')).toContain('主角识破骗局')
    expect(brief.information_flow_contract.information_units.join('｜')).toContain('旧印章回应上一场悬念')
    expect(brief.information_flow_contract.progression_chain.join('｜')).toContain('识破伪证')
    expect(brief.information_flow_contract.progression_chain.join('｜')).toContain('旧印章反推')
    expect(brief.information_flow_contract.transition_compression_rules.join('｜')).toContain('过渡不是填充')
    expect(brief.information_flow_contract.water_risk_guards.join('｜')).toContain('反派背景')
  })

  test('adds an oh-story expectation threshold contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      reader_expectation_debt_context: {
        must_carry: [
          { text: '旧印章背后的证人必须露出行动痕迹', source_chapter_no: 13 },
        ],
        keep_alive: [
          { text: '幕后长老是谁仍然不能揭开' },
        ],
      },
      storyline_context: {
        required: ['主角必须先拿到证人保护资格'],
        chapter_usage: [
          { type: 'advance', name: '证人保护资格', summary: '进入审判庭内层前必须获得临时资格' },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '资格门槛',
        summary: '主角想见到真正证人，但必须先拿到三项资格条件。',
        conflict: '执事提出气血达标、独自取回阵牌、公开验明旧印三项条件。',
        ending_hook: '第三项条件刚通过，证人保护室里传出主角父亲的声音。',
        scene_cards: [
          {
            scene_no: 1,
            title: '资格公布',
            purpose: '把见证人的大目标拆成三项门槛。',
            conflict: '执事要求气血达标、取回阵牌、验明旧印。',
            required_thresholds: ['气血达标', '独自取回阵牌', '公开验明旧印'],
            reader_payoff: '读者明确短期目标：先过资格门槛。',
          },
          {
            scene_no: 2,
            title: '动态加码',
            purpose: '主角通过前两项后，执事临时提高第三项难度。',
            conflict: '旧印必须在众目睽睽下验明。',
            dynamic_threshold: '资源超标时提高门槛：公开验印会暴露父亲线索。',
            reader_payoff: '通过门槛但付出暴露线索的代价。',
            ending_hook_seed: '证人保护室里传出父亲声音。',
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
      { chapter_no: 14, title: '资格门槛' },
    )

    expect(brief.expectation_threshold_contract.version).toBe('oh_story_expectation_threshold_v1')
    expect(brief.expectation_threshold_contract.short_expectation).toContain('先过资格门槛')
    expect(brief.expectation_threshold_contract.long_expectations.join('｜')).toContain('幕后长老是谁')
    expect(brief.expectation_threshold_contract.thresholds.join('｜')).toContain('气血达标')
    expect(brief.expectation_threshold_contract.thresholds.join('｜')).toContain('公开验明旧印')
    expect(brief.expectation_threshold_contract.dynamic_thresholds.join('｜')).toContain('公开验印会暴露父亲线索')
    expect(brief.expectation_threshold_contract.expectation_before_payoff_rules.join('｜')).toContain('期待感 > 爽点')
    expect(brief.expectation_threshold_contract.expectation_before_payoff_rules.join('｜')).toContain('铺垫的篇幅')
    expect(brief.expectation_threshold_contract.expectation_relay_rules.join('｜')).toContain('期待接力法')
    expect(brief.expectation_threshold_contract.expectation_relay_rules.join('｜')).toContain('当一层即将满足时，先铺好下一层的期待')
    expect(brief.expectation_threshold_contract.expectation_relay_rules.join('｜')).toContain('至少两条期待线并行运行')
    expect(brief.expectation_threshold_contract.three_expectation_lines.plot_expectation).toContain('幕后长老是谁')
    expect(brief.expectation_threshold_contract.three_expectation_lines.theme_payoff).toContain('先过资格门槛')
    expect(brief.expectation_threshold_contract.three_expectation_lines.freshness_hook).toContain('公开验印会暴露父亲线索')
    expect(brief.expectation_threshold_contract.quality_checks.join('｜')).toContain('两长一短')
    expect(confirmedContext.chapter_target.expectation_threshold_contract.thresholds.join('｜')).toContain('独自取回阵牌')
    expect(confirmedContext.chapter_target.expectation_threshold_contract.three_expectation_lines.freshness_hook).toContain('公开验印会暴露父亲线索')
    expect(prompt).toContain('【期待门槛合同】')
    expect(prompt).toContain('执行 chapter_target.expectation_threshold_contract')
    expect(prompt).toContain('两长一短')
    expect(prompt).toContain('剧情期待 + 主题甜头 + 新鲜感')
    expect(prompt).toContain('期待感 > 爽点')
    expect(prompt).toContain('期待接力法')
    expect(prompt).toContain('当一层即将满足时，先铺好下一层的期待')
    expect(prompt).toContain('每跨越一个门槛就立刻设立下一个')
    expect(prompt).toContain('expectation_threshold_checks')
    expect(prompt.indexOf('【期待门槛合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit expectation threshold contract from reader expectation context', () => {
    const contextPackage = {
      expectation_threshold_contract: {
        source: 'manual_incomplete',
        short_expectation: '手填短期待：先拿到入场资格。',
        quality_checks: ['必须确认两长一短没有断线。'],
      },
      reader_expectation_debt_context: {
        must_carry: [
          { text: '父亲旧案的真相必须继续保温', source_chapter_no: 8 },
        ],
        keep_alive: [
          { text: '幕后长老为什么放任主角进入内层仍然不能揭开' },
        ],
      },
      storyline_context: {
        required: ['主角必须先证明自己有审判庭行动资格'],
        chapter_usage: [
          { type: 'advance', name: '审判庭资格', summary: '进入内层前必须获得临时行动资格' },
        ],
      },
      chapter_target: {
        chapter_no: 15,
        title: '入场门槛',
        summary: '主角要进入审判庭内层，但必须分三步证明自己。',
        conflict: '执事提出气血达标、找回阵牌、公开验明旧印三项条件。',
        ending_hook: '第三项通过后，内层传出父亲的声音。',
        scene_cards: [
          {
            scene_no: 1,
            title: '三项门槛',
            purpose: '把进入内层的目标拆成三项条件。',
            required_thresholds: ['气血达标', '找回阵牌', '公开验明旧印'],
            reader_payoff: '读者明确当前章先解决入场资格。',
          },
          {
            scene_no: 2,
            title: '临时加码',
            purpose: '主角通过前两项后被迫公开旧印。',
            dynamic_threshold: '公开验印会暴露父亲线索。',
            reader_payoff: '通过门槛但付出线索暴露代价。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)

    expect(brief.expectation_threshold_contract.source).toBe('manual_incomplete')
    expect(brief.expectation_threshold_contract.short_expectation).toBe('手填短期待：先拿到入场资格。')
    expect(brief.expectation_threshold_contract.quality_checks).toEqual(['必须确认两长一短没有断线。'])
    expect(brief.expectation_threshold_contract.medium_expectations.join('｜')).toContain('审判庭行动资格')
    expect(brief.expectation_threshold_contract.long_expectations.join('｜')).toContain('幕后长老为什么放任主角进入内层')
    expect(brief.expectation_threshold_contract.thresholds.join('｜')).toContain('气血达标')
    expect(brief.expectation_threshold_contract.thresholds.join('｜')).toContain('公开验明旧印')
    expect(brief.expectation_threshold_contract.dynamic_thresholds.join('｜')).toContain('公开验印会暴露父亲线索')
    expect(brief.expectation_threshold_contract.nested_units.join('｜')).toContain('主角要进入审判庭内层')
    expect(brief.expectation_threshold_contract.expectation_relay_rules.join('｜')).toContain('期待接力法')
  })

  test('hydrates explicit expectation relay rules from camel case input', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '反证长篇' },
      {
        chapter_target: {
          chapter_no: 16,
          title: '接力钩子',
          summary: '主角即将完成当前门槛，但必须先埋下一层期待。',
          expectation_threshold_contract: {
            source: 'manual_expectation',
            expectationRelayRules: ['自定义：旧期待闭环前，新开环必须已经进入场景行动。'],
          },
        },
      },
    )

    expect(brief.expectation_threshold_contract.source).toBe('manual_expectation')
    expect(brief.expectation_threshold_contract.expectation_relay_rules).toEqual(['自定义：旧期待闭环前，新开环必须已经进入场景行动。'])
    expect(brief.expectation_threshold_contract.expectation_before_payoff_rules.join('｜')).toContain('期待感 > 爽点')
  })

  test('adds an oh-story target reader contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      target_platform: 'fanqie',
      target_audience: '18-30岁喜欢强钩子、规则反制和双主角互补的番茄男频读者',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          target_reader: {
            age_range: '18-30',
            occupation: '学生和通勤上班族',
            gender: '男频为主',
            platform: '番茄',
            life_situation: '碎片时间追更，需要低门槛强反馈',
            desires: ['规则反制爽点', '双主角互补', '章末强钩子'],
            emotional_gap: '现实里被规则和流程压着走，缺少掌控感。',
            hidden_complexes: ['不甘被安排', '渴望亲手反制不公平'],
            comment_emotion_keywords: ['不甘', '掌控', '解气'],
            unmet_needs: ['快速反馈', '尊严补偿'],
          },
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '智斗规则边界'],
            retention_strategy: '前三章快速展示规则反制和双主角互补。',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 15,
        title: '门外判定',
        summary: '主角用超人力量试探门槛，却被规则反制。',
        conflict: '救门外学生会违规，不救又会错过证人线索。',
        ending_hook: '门外学生报出主角只有搭档才知道的暗号。',
        scene_cards: [
          {
            scene_no: 1,
            title: '门槛试探',
            purpose: '用低门槛危机展示规则反制。',
            conflict: '超人力量不能越过宿舍白线。',
            reader_payoff: '超人蛮力被规则反制，理性搭档找到判定边界。',
            opening_hook: '十点整，门外学生把脸贴在玻璃上。',
            ending_hook_seed: '学生说出搭档暗号。',
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
      { chapter_no: 15, title: '门外判定' },
    )

    expect(brief.target_reader_contract.version).toBe('oh_story_target_reader_v1')
    expect(brief.target_reader_contract.reader_profile).toContain('18-30')
    expect(brief.target_reader_contract.reader_profile).toContain('番茄')
    expect(brief.target_reader_contract.reader_desires.join('｜')).toContain('规则反制爽点')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('核心痛苦')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('深层情结')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('高频情绪关键词')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('未满足需求')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('掌控感')
    expect(brief.target_reader_contract.chapter_attractions.join('｜')).toContain('超人蛮力被规则反制')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('样本验证')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('新鲜期')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('成熟期')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('审美疲劳期')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('不能用A网站的样本直接套到B网站')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('番茄')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('强情绪')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('起点')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('慢节奏')
    expect(brief.target_reader_contract.boundary_fit_rules.join('｜')).toContain('边界感')
    expect(brief.target_reader_contract.boundary_fit_rules.join('｜')).toContain('素材、知识储备和篇幅')
    expect(brief.target_reader_contract.title_blurb_alignment_rules.join('｜')).toContain('书名3秒抓人')
    expect(brief.target_reader_contract.title_blurb_alignment_rules.join('｜')).toContain('简介有安全感+钩子')
    expect(brief.target_reader_contract.title_blurb_alignment_rules.join('｜')).toContain('书名简介内容三位一体')
    expect(brief.target_reader_contract.immersion_plasticity_rules.join('｜')).toContain('代入感')
    expect(brief.target_reader_contract.immersion_plasticity_rules.join('｜')).toContain('塑料感')
    expect(brief.target_reader_contract.immersion_plasticity_rules.join('｜')).toContain('世界观自洽')
    expect(brief.target_reader_contract.goldfinger_life_fit_rules.join('｜')).toContain('金手指必须与主角生活/职业息息相关')
    expect(brief.target_reader_contract.commercial_expression_rules.join('｜')).toContain('私人表达')
    expect(brief.target_reader_contract.commercial_expression_rules.join('｜')).toContain('5%')
    expect(brief.target_reader_contract.validation_questions.join('｜')).toContain('我这书写给谁看')
    expect(confirmedContext.chapter_target.target_reader_contract.quality_checks.join('｜')).toContain('三问')
    expect(prompt).toContain('【目标读者合同】')
    expect(prompt).toContain('执行 chapter_target.target_reader_contract')
    expect(prompt).toContain('自嗨判定法')
    expect(prompt).toContain('情绪缺口')
    expect(prompt).toContain('核心痛苦')
    expect(prompt).toContain('高频情绪关键词')
    expect(prompt).toContain('题材生命力')
    expect(prompt).toContain('目标平台样本')
    expect(prompt).toContain('书名简介内容三位一体')
    expect(prompt).toContain('代入感/塑料感')
    expect(prompt).toContain('金手指生活关联')
    expect(prompt).toContain('target_reader_checks')
    expect(prompt.indexOf('【目标读者合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit target reader contract from project and chapter context', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      target_platform: 'fanqie',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          target_reader: {
            desires: ['规则反制爽点', '双主角互补', '章末强钩子'],
            emotional_gap: '现实里被规则和流程压着走，缺少掌控感。',
            hidden_complexes: ['不甘被安排'],
            unmet_needs: ['快速反馈'],
          },
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '智斗规则边界'],
            retention_strategy: '前三章快速展示规则反制和双主角互补。',
          },
        },
      },
    }
    const contextPackage = {
      target_reader_contract: {
        source: 'manual_incomplete',
        reader_profile: '手填读者画像：碎片时间追更的番茄男频读者。',
        quality_checks: ['必须确认本章给了目标读者可感知回报。'],
      },
      chapter_target: {
        chapter_no: 16,
        title: '门外判定',
        summary: '主角用超人力量试探门槛，却被规则反制。',
        conflict: '救门外学生会违规，不救又会错过证人线索。',
        ending_hook: '门外学生报出主角只有搭档才知道的暗号。',
        scene_cards: [
          {
            scene_no: 1,
            title: '门槛试探',
            purpose: '用低门槛危机展示规则反制。',
            conflict: '超人力量不能越过宿舍白线。',
            reader_payoff: '超人蛮力被规则反制，理性搭档找到判定边界。',
            opening_hook: '十点整，门外学生把脸贴在玻璃上。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.target_reader_contract.source).toBe('manual_incomplete')
    expect(brief.target_reader_contract.reader_profile).toBe('手填读者画像：碎片时间追更的番茄男频读者。')
    expect(brief.target_reader_contract.quality_checks).toEqual(['必须确认本章给了目标读者可感知回报。'])
    expect(brief.target_reader_contract.reader_desires.join('｜')).toContain('规则反制爽点')
    expect(brief.target_reader_contract.reader_desires.join('｜')).toContain('智斗规则边界')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('核心痛苦')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('深层情结')
    expect(brief.target_reader_contract.chapter_attractions.join('｜')).toContain('超人蛮力被规则反制')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('样本验证')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('不能用A网站的样本直接套到B网站')
    expect(brief.target_reader_contract.boundary_fit_rules.join('｜')).toContain('素材、知识储备和篇幅')
    expect(brief.target_reader_contract.title_blurb_alignment_rules.join('｜')).toContain('书名简介内容三位一体')
    expect(brief.target_reader_contract.immersion_plasticity_rules.join('｜')).toContain('世界观自洽')
    expect(brief.target_reader_contract.goldfinger_life_fit_rules.join('｜')).toContain('生活/职业')
    expect(brief.target_reader_contract.commercial_expression_rules.join('｜')).toContain('私人表达')
    expect(brief.target_reader_contract.validation_questions.join('｜')).toContain('我这书写给谁看')
    expect(brief.target_reader_contract.correction_methods.join('｜')).toContain('目标读者画像')
  })

  test('adds an oh-story genre positioning contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '离婚后系统让我翻盘',
      genre: '都市系统逆袭',
      target_platform: 'fanqie',
      target_audience: '30岁上下、有经济压力、喜欢系统吐槽和生活化逆袭的番茄男频读者',
      synopsis: '中年失业又离婚的主角获得职业成长系统，用生活化技能逐步翻盘。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会给出讽刺数据和新手奖励',
          protagonist_identity: '刚离婚的中年维修师',
          commercial_positioning: {
            selling_points: ['中年危机翻盘', '系统评价吐槽', '新手奖励立刻见效'],
            innovation_hook: '维修技能和系统奖励绑定现实订单',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '报废边缘',
        summary: '主角收到系统面板，发现自己被评价为报废边缘，随后用新手奖励接下第一单。',
        conflict: '前妻质疑主角没能力翻身，系统用刺眼数据把现实困境摆出来。',
        ending_hook: '系统弹出第一份隐藏装备奖励。',
        scene_cards: [
          {
            scene_no: 1,
            title: '系统面板',
            purpose: '展示系统评价+主角吐槽这个核心笑点。',
            conflict: '系统给出报废边缘评分。',
            reader_payoff: '系统面板讽刺数据让中年危机变成可翻盘目标。',
          },
          {
            scene_no: 2,
            title: '新手奖励',
            purpose: '新手礼包立刻见效。',
            conflict: '主角必须用维修技能证明自己还能接单。',
            reader_payoff: '系统奖励和现实订单绑定。',
            ending_hook_seed: '隐藏装备奖励出现。',
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
      { chapter_no: 2, title: '报废边缘' },
    )

    expect(brief.genre_positioning_contract.version).toBe('oh_story_genre_positioning_v1')
    expect(brief.genre_positioning_contract.genre_label).toContain('都市系统/逆袭长篇')
    expect(brief.genre_positioning_contract.reader_psychology.join('｜')).toContain('中年危机')
    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('系统面板+新手奖励')
    expect(brief.genre_positioning_contract.core_hook_rules.join('｜')).toContain('核心梗')
    expect(brief.genre_positioning_contract.goldfinger_fit_rules.join('｜')).toContain('生活/职业')
    expect(brief.genre_positioning_contract.micro_innovation_rules.join('｜')).toContain('最多3个')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules.join('｜')).toContain('70%来自过去经历和记忆')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules.join('｜')).toContain('20%来自当前生活状态')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules.join('｜')).toContain('10%来自时事热点话题和趋势')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('精炼法')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('升级法')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('加料法')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('反套路法')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('组合法')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('拉长板而非补短板')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('核心卖点背后的情绪清晰')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('至少 3 个角度')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('题材长板')
    expect(confirmedContext.chapter_target.genre_positioning_contract.quality_checks.join('｜')).toContain('书名简介内容三位一体')
    expect(prompt).toContain('【题材定位合同】')
    expect(prompt).toContain('执行 chapter_target.genre_positioning_contract')
    expect(prompt).toContain('都市系统/逆袭长篇')
    expect(prompt).toContain('系统评价+主角吐槽')
    expect(prompt).toContain('70/20/10元素法则')
    expect(prompt).toContain('五种微创新手法')
    expect(prompt).toContain('拉长板而非补短板')
    expect(prompt).toContain('题材长板')
    expect(prompt).toContain('genre_positioning_checks')
    expect(prompt.indexOf('【题材定位合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('routes oh-story genre writing formulas into the genre positioning contract', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '婚礼当天我收回股份',
      genre: '现代复仇打脸短篇',
      target_platform: 'fanqie',
      target_audience: '喜欢公开审判、证据链打脸和冷静复仇的爽文读者',
      synopsis: '未婚夫在婚礼当天当众背叛，女主冷静收回股份，用监控和合同逐层揭露真相。',
      reference_config: {
        writing_bible: {
          protagonist_identity: '被当众背叛的公司继承人',
          commercial_positioning: {
            selling_points: ['当众背叛开场', '证据链公开审判', '反派求饶后彻底出局'],
            innovation_hook: '婚礼现场变成股权审判场',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '婚礼背叛',
        summary: '婚礼现场男方公开偏袒白月光，女主用股权文件当场反击。',
        conflict: '反派以为当众羞辱已经赢了，主角必须用证据夺回主动权。',
        ending_hook: '监控备份开始播放。',
        scene_cards: [
          {
            scene_no: 1,
            title: '当众背叛',
            purpose: '让反派先赢，制造公开羞辱。',
            conflict: '白月光抢走戒指和话筒。',
            reader_payoff: '主角冷静到可怕地拿出第一份证据。',
          },
          {
            scene_no: 2,
            title: '证据开场',
            purpose: '把婚礼现场变成公开审判。',
            conflict: '反派否认证据真实性。',
            reader_payoff: '监控和合同逐层揭露。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-28T10:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 1, title: '婚礼背叛' },
    )

    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('公式一：现代复仇/打脸')
    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('当众背叛 -> 冷静处理 -> 对方反扑 -> 揭示真相 -> 求饶 -> 加冕')
    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('公式二十一：公开审判式打脸')
    expect(brief.genre_positioning_contract.must_have_scenes.join('｜')).toContain('当众羞辱开场')
    expect(brief.genre_positioning_contract.must_have_scenes.join('｜')).toContain('逐层揭露证据')
    expect(brief.genre_positioning_contract.quality_checks.join('｜')).toContain('公式对位')
    expect(brief.genre_positioning_contract.quality_checks.join('｜')).toContain('情绪节拍完整')
    expect(prompt).toContain('公式一：现代复仇/打脸')
    expect(prompt).toContain('公式二十一：公开审判式打脸')
  })

  test('hydrates incomplete explicit genre positioning contract from project and scene context', () => {
    const project = {
      title: '离婚后系统让我翻盘',
      genre: '都市系统逆袭',
      target_audience: '30岁上下、有经济压力、喜欢系统吐槽和生活化逆袭的番茄男频读者',
      synopsis: '中年失业又离婚的主角获得职业成长系统，用生活化技能逐步翻盘。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会给出讽刺数据和新手奖励',
          protagonist_identity: '刚离婚的中年维修师',
          commercial_positioning: {
            selling_points: ['中年危机翻盘', '系统评价吐槽', '新手奖励立刻见效'],
            innovation_hook: '维修技能和系统奖励绑定现实订单',
          },
        },
      },
    }
    const contextPackage = {
      genre_positioning_contract: {
        source: 'manual_incomplete',
        genre_label: '手填题材：都市系统逆袭。',
        quality_checks: ['必须确认题材承诺和正文场景一致。'],
      },
      chapter_target: {
        chapter_no: 2,
        title: '报废边缘',
        summary: '主角收到系统面板，发现自己被评价为报废边缘，随后用新手奖励接下第一单。',
        conflict: '前妻质疑主角没能力翻身，系统用刺眼数据把现实困境摆出来。',
        scene_cards: [
          {
            scene_no: 1,
            title: '系统面板',
            purpose: '展示系统评价+主角吐槽这个核心笑点。',
            conflict: '系统给出报废边缘评分。',
            reader_payoff: '系统面板讽刺数据让中年危机变成可翻盘目标。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.genre_positioning_contract.source).toBe('manual_incomplete')
    expect(brief.genre_positioning_contract.genre_label).toBe('手填题材：都市系统逆袭。')
    expect(brief.genre_positioning_contract.quality_checks).toEqual(['必须确认题材承诺和正文场景一致。'])
    expect(brief.genre_positioning_contract.reader_psychology.join('｜')).toContain('中年危机')
    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('系统面板+新手奖励')
    expect(brief.genre_positioning_contract.core_hook_rules.join('｜')).toContain('系统评价+主角吐槽')
    expect(brief.genre_positioning_contract.must_have_scenes.join('｜')).toContain('系统面板')
    expect(brief.genre_positioning_contract.platform_fit_rules.join('｜')).toContain('番茄偏快节奏')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('拉长板而非补短板')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules.join('｜')).toContain('70%来自过去经历和记忆')
  })

  test('hydrates explicit genre micro innovation methods from camel case input', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '离婚后系统让我翻盘',
        genre: '都市系统逆袭',
        synopsis: '中年失业又离婚的主角获得职业成长系统，用生活化技能逐步翻盘。',
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '报废边缘',
          summary: '主角收到系统面板，发现自己被评价为报废边缘。',
          genre_positioning_contract: {
            source: 'manual_genre',
            microInnovation702010Rules: ['自定义：70%生活记忆，20%当下压力，10%热搜话题。'],
            microInnovationMethods: ['自定义：只用升级法做订单场景升级。'],
          },
        },
      },
    )

    expect(brief.genre_positioning_contract.source).toBe('manual_genre')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules).toEqual(['自定义：70%生活记忆，20%当下压力，10%热搜话题。'])
    expect(brief.genre_positioning_contract.micro_innovation_methods).toEqual(['自定义：只用升级法做订单场景升级。'])
    expect(brief.genre_positioning_contract.micro_innovation_rules.join('｜')).toContain('最多3个')
  })

  test('adds an oh-story female audience contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '八零换亲后我靠经商翻盘',
      genre: '年代重生先婚后爱女频',
      target_platform: 'fanqie_girls',
      target_audience: '番茄女生读者，喜欢重生改命、先婚后爱、事业翻盘和早给安全感',
      synopsis: '女主重生回换亲前，选择先婚后爱路线，用经商能力改命并逐步被珍视。',
      reference_config: {
        writing_bible: {
          protagonist_identity: '被换亲的重生女主',
          relationship_core: '先婚后爱，感情升级绑定女主事业节点',
          commercial_positioning: {
            selling_points: ['重生改命', '经商事业线', '先婚后爱安全感'],
            retention_strategy: '前三章给女主主动选择和翻盘方向。',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 3,
        title: '第一笔订单',
        summary: '女主主动接下供销社订单，用上一世经验避开极品家人的陷阱。',
        conflict: '极品家人逼她交出彩礼，男主家也怀疑她只是临时忍让。',
        ending_hook: '男主第一次发现她提前准备好了退路。',
        scene_cards: [
          {
            scene_no: 1,
            title: '当众拒交',
            purpose: '展示女主主动性和安全感锚点。',
            conflict: '极品亲戚逼她交出钱。',
            reader_payoff: '女主没有继续被虐，而是用订单合同反打。',
          },
          {
            scene_no: 2,
            title: '订单落地',
            purpose: '让事业节点推动感情线升温。',
            conflict: '男主质疑她是不是冲动。',
            reader_payoff: '男主看到她的能力和边界，关系从试探转为尊重。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-23T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 3, title: '第一笔订单' },
    )

    expect(brief.female_audience_contract.version).toBe('oh_story_female_audience_v1')
    expect(brief.female_audience_contract.core_principles.join('｜')).toContain('安全感优先')
    expect(brief.female_audience_contract.core_principles.join('｜')).toContain('代入感优先')
    expect(brief.female_audience_contract.core_principles.join('｜')).toContain('女主主动性')
    expect(brief.female_audience_contract.core_principles.join('｜')).toContain('情绪即产品')
    expect(brief.female_audience_contract.reader_need_rules.join('｜')).toContain('被认可、被珍视、被尊重')
    expect(brief.female_audience_contract.copy_promise_rules.join('｜')).toContain('状态 → 困境 → 行动 → 成功')
    expect(brief.female_audience_contract.copy_promise_rules.join('｜')).toContain('女主成功暗示')
    expect(brief.female_audience_contract.romance_axis_rules.join('｜')).toContain('感情升级最好踩在女主的一次事业进展或成长节点上')
    expect(brief.female_audience_contract.romance_axis_rules.join('｜')).toContain('暧昧→确认→危机→升华')
    expect(brief.female_audience_contract.abuse_dosage_rules.join('｜')).toContain('每段虐后必给反转或糖')
    expect(brief.female_audience_contract.abuse_dosage_rules.join('｜')).toContain('连续整卷只虐')
    expect(brief.female_audience_contract.platform_fit_rules.join('｜')).toContain('番茄女生')
    expect(brief.female_audience_contract.platform_fit_rules.join('｜')).toContain('安全感要早给')
    expect(confirmedContext.chapter_target.female_audience_contract.quality_checks.join('｜')).toContain('货板一致')
    expect(prompt).toContain('【女频长篇合同】')
    expect(prompt).toContain('执行 chapter_target.female_audience_contract')
    expect(prompt).toContain('安全感优先')
    expect(prompt).toContain('女主主动性')
    expect(prompt).toContain('感情线双轴')
    expect(prompt).toContain('female_audience_checks')
    expect(prompt.indexOf('【女频长篇合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit female audience contract from project and scene context', () => {
    const project = {
      title: '八零换亲后我靠经商翻盘',
      genre: '年代重生先婚后爱女频',
      target_platform: 'fanqie_girls',
      target_audience: '番茄女生读者，喜欢重生改命、先婚后爱、事业翻盘和早给安全感',
      synopsis: '女主重生回换亲前，选择先婚后爱路线，用经商能力改命并逐步被珍视。',
    }
    const contextPackage = {
      female_audience_contract: {
        source: 'manual_incomplete',
        core_principles: ['手填原则：安全感不能断。'],
        quality_checks: ['必须确认女主不是被安排着赢。'],
      },
      chapter_target: {
        chapter_no: 4,
        title: '第一笔订单',
        summary: '女主主动接下供销社订单，用上一世经验避开极品家人的陷阱。',
        conflict: '极品家人逼她交出彩礼，男主家也怀疑她只是临时忍让。',
        scene_cards: [
          {
            scene_no: 1,
            title: '当众拒交',
            purpose: '展示女主主动性和安全感锚点。',
            conflict: '极品亲戚逼她交出钱。',
            reader_payoff: '女主没有继续被虐，而是用订单合同反打。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.female_audience_contract.source).toBe('manual_incomplete')
    expect(brief.female_audience_contract.core_principles).toEqual(['手填原则：安全感不能断。'])
    expect(brief.female_audience_contract.quality_checks).toEqual(['必须确认女主不是被安排着赢。'])
    expect(brief.female_audience_contract.reader_need_rules.join('｜')).toContain('被认可、被珍视、被尊重')
    expect(brief.female_audience_contract.copy_promise_rules.join('｜')).toContain('女主成功暗示')
    expect(brief.female_audience_contract.romance_axis_rules.join('｜')).toContain('感情升级最好踩在女主的一次事业进展或成长节点上')
    expect(brief.female_audience_contract.platform_fit_rules.join('｜')).toContain('番茄女生')
    expect(brief.female_audience_contract.revision_priorities.join('｜')).toContain('补安全感锚点')
  })

  test('uses project-level female audience activation mode before keyword auto detection', () => {
    const disabledProject = {
      title: '换亲以后',
      genre: '年代先婚后爱女频',
      target_audience: '番茄女生读者',
      synopsis: '女主换亲后先婚后爱。',
      reference_config: {
        oh_story_controls: {
          female_audience_mode: 'disabled',
        },
      },
    }
    const neutralContext = {
      chapter_target: {
        chapter_no: 1,
        title: '新婚第一日',
        summary: '新婚第一日出现误会。',
      },
    }

    const disabledBrief = buildChapterPreDraftBrief(disabledProject, neutralContext)
    expect(disabledBrief.female_audience_contract).toBeNull()

    const forcedProject = {
      title: '她在废土修灯塔',
      genre: '末世科幻',
      target_audience: '全向读者',
      synopsis: '女主在废土修复灯塔，带领社区重建。',
      reference_config: {
        oh_story_controls: {
          female_audience_mode: 'enabled',
        },
      },
    }

    const forcedBrief = buildChapterPreDraftBrief(forcedProject, neutralContext)
    expect(forcedBrief.female_audience_contract.version).toBe('oh_story_female_audience_v1')
    expect(forcedBrief.female_audience_contract.activation_mode).toBe('enabled')
    expect(forcedBrief.female_audience_contract.activation_source).toContain('project.reference_config.oh_story_controls.female_audience_mode')
  })

  test('adds an oh-story upgrade rhythm contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '从报废维修师开始逆袭',
      genre: '都市系统升级',
      target_platform: 'fanqie',
      synopsis: '中年维修师绑定职业成长系统，通过订单经验、技能奖励和客户反应逐步翻身。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会把维修订单转成经验值、技能熟练度和装备奖励',
          protagonist_identity: '被前妻家看不起的中年维修师',
          commercial_positioning: {
            selling_points: ['维修订单升级', '客户态度反转', '系统奖励即时反馈'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '第一单翻身',
        summary: '主角接下被同行放弃的维修单，用新手技能修好进口设备。',
        conflict: '客户和前妻弟弟都质疑主角只是报废维修师。',
        ending_hook: '系统提示等级提升，并解锁隐藏工具箱。',
        scene_cards: [
          {
            scene_no: 1,
            title: '接单前嘲讽',
            purpose: '铺垫升级前待遇差距。',
            conflict: '客户质疑主角没有资格碰进口设备。',
            reader_payoff: '主角被轻视，读者等他翻身。',
          },
          {
            scene_no: 2,
            title: '系统判定',
            purpose: '让订单经验和技能熟练度形成即时反馈。',
            action_beats: ['拆开旧机', '系统提示熟练度+10', '主角发现隐藏磨损点'],
            reader_payoff: '系统面板反馈立刻改变局面。',
          },
          {
            scene_no: 3,
            title: '交付翻身',
            purpose: '展示升级后的能力差距。',
            reversal: '主角修好同行判断报废的进口设备。',
            reader_payoff: '客户主动加价，前妻弟弟说不出话。',
            ending_hook_seed: '系统解锁隐藏工具箱。',
            state_changes_expected: ['客户主动加价', '系统解锁隐藏工具箱'],
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
      { chapter_no: 3, title: '第一单翻身' },
    )

    expect(brief.upgrade_rhythm_contract.version).toBe('oh_story_upgrade_rhythm_v1')
    expect(brief.upgrade_rhythm_contract.upgrade_gap.join('｜')).toContain('起点')
    expect(brief.upgrade_rhythm_contract.upgrade_gain_plan.join('｜')).toContain('客户主动加价')
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('即时反馈')
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('延迟反馈')
    expect(brief.upgrade_rhythm_contract.emotion_modules.join('｜')).toContain('装逼')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('金手指简单是核心')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('一眼就懂')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('功能、触发条件、奖励反馈和升级规则')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('金手指提升要有多维度')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('词条、功能、品质')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('条件-反馈模型')
    expect(brief.upgrade_rhythm_contract.goldfinger_conflict_balance_rules.join('｜')).toContain('金手指刚好解决当前矛盾')
    expect(brief.upgrade_rhythm_contract.goldfinger_conflict_balance_rules.join('｜')).toContain('暴露更大矛盾')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('给出金手指后必须有即时变化')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('掺杂在故事里')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('打开困境的钥匙')
    expect(brief.upgrade_rhythm_contract.ranking_ladder_rules.join('｜')).toContain('排行榜提供升级动力')
    expect(brief.upgrade_rhythm_contract.ranking_ladder_rules.join('｜')).toContain('新对手')
    expect(brief.upgrade_rhythm_contract.ranking_ladder_rules.join('｜')).toContain('装逼余震')
    expect(confirmedContext.chapter_target.upgrade_rhythm_contract.quality_checks.join('｜')).toContain('升级后能完成以前做不到的事')
    expect(prompt).toContain('【升级节奏合同】')
    expect(prompt).toContain('执行 chapter_target.upgrade_rhythm_contract')
    expect(prompt).toContain('升级感三步法')
    expect(prompt).toContain('金手指 + 矛盾')
    expect(prompt).toContain('金手指简单是核心')
    expect(prompt).toContain('一眼就懂')
    expect(prompt).toContain('金手指多维成长')
    expect(prompt).toContain('词条、功能、品质')
    expect(prompt).toContain('刚好解决当前矛盾')
    expect(prompt).toContain('金手指反馈法')
    expect(prompt).toContain('把金手指带来变化的过程掺杂在故事里')
    expect(prompt).toContain('排行榜')
    expect(prompt).toContain('新对手')
    expect(prompt).toContain('装逼余震')
    expect(prompt).toContain('即时反馈')
    expect(prompt).toContain('upgrade_rhythm_checks')
    expect(prompt.indexOf('【升级节奏合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit upgrade rhythm contract from project and scene context', () => {
    const project = {
      title: '从报废维修师开始逆袭',
      genre: '都市系统升级',
      synopsis: '中年维修师绑定职业成长系统，通过订单经验、技能奖励和客户反应逐步翻身。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会把维修订单转成经验值、技能熟练度和装备奖励',
          protagonist_identity: '被前妻家看不起的中年维修师',
          commercial_positioning: {
            selling_points: ['维修订单升级', '客户态度反转', '系统奖励即时反馈'],
          },
        },
      },
    }
    const contextPackage = {
      upgrade_rhythm_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认升级前缺口和升级后变化都被正文看见。'],
      },
      chapter_target: {
        chapter_no: 3,
        title: '第一单翻身',
        summary: '主角接下被同行放弃的维修单，用新手技能修好进口设备。',
        conflict: '客户和前妻弟弟都质疑主角只是报废维修师。',
        ending_hook: '系统提示等级提升，并解锁隐藏工具箱。',
        scene_cards: [
          {
            scene_no: 1,
            title: '接单前嘲讽',
            purpose: '铺垫升级前待遇差距。',
            conflict: '客户质疑主角没有资格碰进口设备。',
            reader_payoff: '主角被轻视，读者等他翻身。',
          },
          {
            scene_no: 2,
            title: '系统判定',
            purpose: '让订单经验和技能熟练度形成即时反馈。',
            action_beats: ['拆开旧机', '系统提示熟练度+10', '主角发现隐藏磨损点'],
            reader_payoff: '系统面板反馈立刻改变局面。',
          },
          {
            scene_no: 3,
            title: '交付翻身',
            purpose: '展示升级后的能力差距。',
            reversal: '主角修好同行判断报废的进口设备。',
            reader_payoff: '客户主动加价，前妻弟弟说不出话。',
            ending_hook_seed: '系统解锁隐藏工具箱。',
            state_changes_expected: ['客户主动加价', '系统解锁隐藏工具箱'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.upgrade_rhythm_contract.source).toBe('manual_incomplete')
    expect(brief.upgrade_rhythm_contract.quality_checks).toEqual(['必须确认升级前缺口和升级后变化都被正文看见。'])
    expect(brief.upgrade_rhythm_contract.upgrade_gap.join('｜')).toContain('被前妻家看不起')
    expect(brief.upgrade_rhythm_contract.upgrade_gap.join('｜')).toContain('客户质疑主角没有资格')
    expect(brief.upgrade_rhythm_contract.upgrade_gain_plan.join('｜')).toContain('客户主动加价')
    expect(brief.upgrade_rhythm_contract.upgrade_gain_plan.join('｜')).toContain('系统解锁隐藏工具箱')
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('系统提示熟练度+10')
    expect(brief.upgrade_rhythm_contract.emotion_modules.join('｜')).toContain('装逼')
    expect(brief.upgrade_rhythm_contract.bridge_rhythm.join('｜')).toContain('四章一桥段')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('金手指简单是核心')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('一眼就懂')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('金手指提升要有多维度')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('词条、功能、品质')
    expect(brief.upgrade_rhythm_contract.goldfinger_conflict_balance_rules.join('｜')).toContain('金手指太强')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('给出金手指后必须有即时变化')
  })

  test('hydrates explicit upgrade rhythm goldfinger feedback rules from camel case input', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '从报废维修师开始逆袭',
        genre: '都市系统升级',
        synopsis: '中年维修师绑定职业成长系统，通过订单经验、技能奖励和客户反应逐步翻身。',
      },
      {
        chapter_target: {
          chapter_no: 3,
          title: '第一单翻身',
          summary: '主角接下被同行放弃的维修单，用新手技能修好进口设备。',
          conflict: '客户和前妻弟弟都质疑主角只是报废维修师。',
          upgrade_rhythm_contract: {
            source: 'manual_upgrade',
            goldfingerFeedbackRules: ['自定义：系统反馈必须先改变主角手上的维修动作。'],
          },
        },
      },
    )

    expect(brief.upgrade_rhythm_contract.source).toBe('manual_upgrade')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules).toEqual(['自定义：系统反馈必须先改变主角手上的维修动作。'])
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('即时反馈')
  })

  test('adds an oh-story conflict structure contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '旧城订单',
      genre: '都市系统逆袭',
      synopsis: '中年维修师靠职业成长系统接单翻身，但旧城区维修协会持续打压外来维修师。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统能识别设备隐藏故障并给出技能反馈',
          protagonist_identity: '被维修协会排挤的外来维修师',
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 4,
        title: '协会封单',
        summary: '维修协会用封单规则阻止主角接触旧城设备，主角必须当场证明封单规则有漏洞。',
        conflict: '协会会长不许主角碰设备，客户也担心惹怒协会。',
        ending_hook: '协会会长拿出第二份封单，指向主角刚接的医院设备。',
        scene_cards: [
          {
            scene_no: 1,
            title: '口头封单',
            purpose: '先用言语压迫制造冲突。',
            conflict: '协会会长当众宣布外来维修师不得接旧城订单。',
            reader_payoff: '主角被公开压制，读者等待反证。',
          },
          {
            scene_no: 2,
            title: '设备现场',
            purpose: '冲突升级到行动阻拦。',
            conflict: '协会成员挡住设备间门口，不让主角拆机。',
            action_beats: ['主角绕到旧线路口', '协会成员抢走工具箱', '客户要求立刻给结果'],
            reader_payoff: '主角必须用别人想不到的方法破局。',
          },
          {
            scene_no: 3,
            title: '当场反证',
            purpose: '决定胜负并留下下一冲突。',
            conflict: '会长要求客户签封单确认书。',
            reversal: '主角用系统识别的隐藏故障证明协会规则掩盖事故。',
            reader_payoff: '客户从犹豫变成公开支持主角。',
            ending_hook_seed: '第二份封单指向医院设备。',
            state_changes_expected: ['客户资格从拒绝到认可', '协会会长失去现场主动权'],
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
      { chapter_no: 4, title: '协会封单' },
    )

    expect(brief.conflict_structure_contract.version).toBe('oh_story_conflict_structure_v1')
    expect(brief.conflict_structure_contract.conflict_ladder.join('｜')).toContain('言语->行动->激烈对抗->决定胜负')
    expect(brief.conflict_structure_contract.motivation_sources.join('｜')).toContain('金手指')
    expect(brief.conflict_structure_contract.antagonist_pressure_rules.join('｜')).toContain('压势不压人')
    expect(brief.conflict_structure_contract.protagonist_agency_rules.join('｜')).toContain('做别人不敢做')
    expect(brief.conflict_structure_contract.event_value_changes.join('｜')).toContain('客户资格从拒绝到认可')
    expect(brief.conflict_structure_contract.no_exit_rules.join('｜')).toContain('读者必须相信主角非踏入不可')
    expect(brief.conflict_structure_contract.no_exit_rules.join('｜')).toContain('黏结剂')
    expect(brief.conflict_structure_contract.conflict_web.active_lines.join('｜')).toContain('协会会长当众宣布外来维修师不得接旧城订单')
    expect(brief.conflict_structure_contract.conflict_web.link_rules.join('｜')).toContain('因果')
    expect(brief.conflict_structure_contract.conflict_web.activation_rules.join('｜')).toContain('激活或加深')
    expect(brief.conflict_structure_contract.conflict_network_layers.vertical_conflict).toContain('纵向矛盾')
    expect(brief.conflict_structure_contract.conflict_network_layers.horizontal_conflict).toContain('横向矛盾')
    expect(brief.conflict_structure_contract.conflict_network_layers.cross_conflict).toContain('交叉矛盾')
    expect(brief.conflict_structure_contract.conflict_network_layers.weaving_order.join('｜')).toContain('定地图→定阵营→定角色')
    expect(confirmedContext.chapter_target.conflict_structure_contract.quality_checks.join('｜')).toContain('明确结果')
    expect(prompt).toContain('【冲突结构合同】')
    expect(prompt).toContain('执行 chapter_target.conflict_structure_contract')
    expect(prompt).toContain('有人阻止主角得到他想要的东西')
    expect(prompt).toContain('压势不压人')
    expect(prompt).toContain('有进无出')
    expect(prompt).toContain('非踏入不可')
    expect(prompt).toContain('矛盾网')
    expect(prompt).toContain('纵向矛盾')
    expect(prompt).toContain('横向矛盾')
    expect(prompt).toContain('交叉矛盾')
    expect(prompt).toContain('定地图→定阵营→定角色')
    expect(prompt).toContain('conflict_structure_checks')
    expect(prompt.indexOf('【冲突结构合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit conflict structure contract from scene conflict context', () => {
    const project = {
      title: '旧城订单',
      genre: '都市系统逆袭',
      synopsis: '中年维修师靠职业成长系统接单翻身，但旧城区维修协会持续打压外来维修师。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统能识别设备隐藏故障并给出技能反馈',
          protagonist_identity: '被维修协会排挤的外来维修师',
        },
      },
    }
    const contextPackage = {
      conflict_structure_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认每个主要场景都有明确阻力和胜负变化。'],
      },
      chapter_target: {
        chapter_no: 4,
        title: '协会封单',
        summary: '维修协会用封单规则阻止主角接触旧城设备，主角必须当场证明封单规则有漏洞。',
        conflict: '协会会长不许主角碰设备，客户也担心惹怒协会。',
        ending_hook: '协会会长拿出第二份封单，指向主角刚接的医院设备。',
        scene_cards: [
          {
            scene_no: 1,
            title: '口头封单',
            purpose: '先用言语压迫制造冲突。',
            conflict: '协会会长当众宣布外来维修师不得接旧城订单。',
            reader_payoff: '主角被公开压制，读者等待反证。',
          },
          {
            scene_no: 2,
            title: '设备现场',
            purpose: '冲突升级到行动阻拦。',
            conflict: '协会成员挡住设备间门口，不让主角拆机。',
            action_beats: ['主角绕到旧线路口', '协会成员抢走工具箱', '客户要求立刻给结果'],
            reader_payoff: '主角必须用别人想不到的方法破局。',
          },
          {
            scene_no: 3,
            title: '当场反证',
            purpose: '决定胜负并留下下一冲突。',
            conflict: '会长要求客户签封单确认书。',
            reversal: '主角用系统识别的隐藏故障证明协会规则掩盖事故。',
            ending_hook_seed: '第二份封单指向医院设备。',
            state_changes_expected: ['客户资格从拒绝到认可', '协会会长失去现场主动权'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.conflict_structure_contract.source).toBe('manual_incomplete')
    expect(brief.conflict_structure_contract.quality_checks).toEqual(['必须确认每个主要场景都有明确阻力和胜负变化。'])
    expect(brief.conflict_structure_contract.conflict_ladder.join('｜')).toContain('协会成员挡住设备间门口')
    expect(brief.conflict_structure_contract.motivation_sources.join('｜')).toContain('金手指')
    expect(brief.conflict_structure_contract.motivation_sources.join('｜')).toContain('世界背景')
    expect(brief.conflict_structure_contract.antagonist_pressure_rules.join('｜')).toContain('压势不压人')
    expect(brief.conflict_structure_contract.protagonist_agency_rules.join('｜')).toContain('做别人不敢做')
    expect(brief.conflict_structure_contract.event_value_changes.join('｜')).toContain('客户资格从拒绝到认可')
    expect(brief.conflict_structure_contract.next_conflict_seeds.join('｜')).toContain('第二份封单指向医院设备')
    expect(brief.conflict_structure_contract.no_exit_rules.join('｜')).toContain('读者必须相信主角非踏入不可')
    expect(brief.conflict_structure_contract.conflict_web.active_lines.join('｜')).toContain('协会成员挡住设备间门口')
    expect(brief.conflict_structure_contract.conflict_web.activation_rules.join('｜')).toContain('解决一条矛盾线后')
  })

  test('adds an oh-story story loop contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          golden_finger: '超人级身体能力，但被规则边界限制',
          protagonist_identity: '被卷入规则宿舍的超人学生',
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '每章用信息差破解一条规则'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        title: '第二条规则',
        summary: '主角用上一章的判定边界破解第二条宿舍规则。',
        conflict: '门外学生给出假线索，主角必须判断哪条规则是真的。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        scene_cards: [
          {
            scene_no: 1,
            title: '假线索',
            purpose: '进入新规则案件。',
            conflict: '门外学生提供的规则和墙上规则矛盾。',
            information_gap: '哪条规则是真的。',
            reader_payoff: '读者看到主角用信息差验证规则。',
          },
          {
            scene_no: 2,
            title: '部分真相',
            purpose: '解出规则判定条件，同时抛出更大谜团。',
            reversal: '真正危险不是开门，而是回应名字。',
            reader_payoff: '部分真相带来新规则谜团。',
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
      { chapter_no: 16, title: '第二条规则' },
    )

    expect(brief.story_loop_contract.version).toBe('oh_story_story_loop_v1')
    expect(brief.story_loop_contract.loop_formula).toContain('题材 + 金手指 + 主角身份')
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('规则怪谈')
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('超人级身体能力')
    expect(brief.story_loop_contract.loop_mode).toContain('案件串循环')
    expect(brief.story_loop_contract.loop_fuel).toContain('信息差')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('案件')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('更大谜团')
    expect(brief.story_loop_contract.map_resource_loop.join('｜')).toContain('资源闭环')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('旧地图核心冲突至少阶段性解决')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('前5章必须快速建立新的代入感和期待感')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('人际关系动了 -> 主角再动')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环 -> 中循环')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环中必须铺垫大循环的期待')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('同一核心卖点的不同角度')
    expect(confirmedContext.chapter_target.story_loop_contract.quality_checks.join('｜')).toContain('循环模式')
    expect(prompt).toContain('【故事循环合同】')
    expect(prompt).toContain('执行 chapter_target.story_loop_contract')
    expect(prompt).toContain('题材 + 金手指 + 主角身份')
    expect(prompt).toContain('换地图承接')
    expect(prompt).toContain('新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突')
    expect(prompt).toContain('人际关系动了 -> 主角再动')
    expect(prompt).toContain('循环嵌套')
    expect(prompt).toContain('小循环 -> 中循环 -> 大循环')
    expect(prompt).toContain('story_loop_checks')
    expect(prompt.indexOf('【故事循环合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit story loop contract from project and scene context', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          golden_finger: '超人级身体能力，但被规则边界限制',
          protagonist_identity: '被卷入规则宿舍的超人学生',
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '每章用信息差破解一条规则'],
          },
        },
      },
    }
    const contextPackage = {
      story_loop_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认本章推进一次可持续循环。'],
      },
      chapter_target: {
        chapter_no: 16,
        title: '第二条规则',
        summary: '主角用上一章的判定边界破解第二条宿舍规则。',
        conflict: '门外学生给出假线索，主角必须判断哪条规则是真的。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        scene_cards: [
          {
            scene_no: 1,
            title: '假线索',
            purpose: '进入新规则案件。',
            conflict: '门外学生提供的规则和墙上规则矛盾。',
            information_gap: '哪条规则是真的。',
            reader_payoff: '读者看到主角用信息差验证规则。',
          },
          {
            scene_no: 2,
            title: '部分真相',
            purpose: '解出规则判定条件，同时抛出更大谜团。',
            reversal: '真正危险不是开门，而是回应名字。',
            reader_payoff: '部分真相带来新规则谜团。',
            ending_hook_seed: '第三条规则只对超人有效。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.story_loop_contract.source).toBe('manual_incomplete')
    expect(brief.story_loop_contract.quality_checks).toEqual(['必须确认本章推进一次可持续循环。'])
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('规则怪谈')
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('超人级身体能力')
    expect(brief.story_loop_contract.loop_mode).toContain('案件串循环')
    expect(brief.story_loop_contract.loop_fuel).toContain('信息差')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('哪条规则是真的')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('第三条规则只对超人有效')
    expect(brief.story_loop_contract.map_resource_loop.join('｜')).toContain('资源闭环')
    expect(brief.story_loop_contract.escalation_rules.join('｜')).toContain('地位升高')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环 -> 中循环')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环中必须铺垫大循环的期待')
  })

  test('adds an oh-story emotional arc contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角被诬告后在公开场合逐步反证，完成打脸翻盘。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        title: '审判庭反证',
        summary: '主角在公开审判庭从被诬告到拿出证据完成反证。',
        conflict: '对手当众羞辱并逼主角认罪，主角必须忍住压力等待证据。',
        emotional_curve: '压迫 -> 代价加速 -> 反证释放 -> 爽感',
        ending_hook: '真正的幕后证人从屏风后走出。',
        scene_cards: [
          {
            scene_no: 1,
            title: '公开羞辱',
            purpose: '把私下诬告升级到公开审判。',
            conflict: '长老逼主角认罪。',
            emotional_tone: '压迫和不该如此',
            reader_payoff: '读者替主角憋着等反击。',
          },
          {
            scene_no: 2,
            title: '证据反打',
            purpose: '用账本印记完成反证。',
            reversal: '账本反而证明对手调包。',
            emotional_tone: '释放和爽感',
            reader_payoff: '当众打脸，旁观者态度转变。',
            ending_hook_seed: '幕后证人出现。',
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
      { chapter_no: 17, title: '审判庭反证' },
    )

    expect(brief.emotional_arc_contract.version).toBe('oh_story_emotional_arc_v1')
    expect(brief.emotional_arc_contract.emotion_formula).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(brief.emotional_arc_contract.arc_shape).toContain('递进形')
    expect(brief.emotional_arc_contract.pressure_methods.join('｜')).toContain('公开升级')
    expect(brief.emotional_arc_contract.payoff_types.join('｜')).toContain('态度转变')
    expect(brief.emotional_arc_contract.payoff_reverse_design.design_order.join('｜')).toContain('先确定用什么方式让读者满足')
    expect(brief.emotional_arc_contract.payoff_reverse_design.design_order.join('｜')).toContain('再设计如何拉起期待')
    expect(brief.emotional_arc_contract.payoff_reverse_design.design_order.join('｜')).toContain('最后设计如何铺垫')
    expect(brief.emotional_arc_contract.payoff_tier_rules.join('｜')).toContain('核心爽点')
    expect(brief.emotional_arc_contract.payoff_tier_rules.join('｜')).toContain('偏离爽点')
    expect(brief.emotional_arc_contract.payoff_density_rules.join('｜')).toContain('不要拉长单个爽点')
    expect(brief.emotional_arc_contract.payoff_density_rules.join('｜')).toContain('多想几个爽点')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('戏剧性会磨损')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('情绪不会磨损')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('换场景')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('换对手')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('加新情绪')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('影响范围')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('揭示深度')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('身份落差')
    expect(brief.emotional_arc_contract.expectation_rules.join('｜')).toContain('断期待禁止')
    expect(brief.emotional_arc_contract.bonding_setup_rules.join('｜')).toContain('具体物件')
    expect(brief.emotional_arc_contract.bonding_setup_rules.join('｜')).toContain('具体数字')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('反差法')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('错位法')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('延迟真相法')
    expect(brief.emotional_arc_contract.lingering_aftertaste_rules.join('｜')).toContain('安静细节')
    expect(brief.emotional_arc_contract.emotional_turning_rules.join('｜')).toContain('每 3-5 个小节')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('先入为主')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('前100字')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('否定提前')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('峰终定律')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('结尾情绪必须高于起点')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('爽≥7')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('角色自己的情绪')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('文本传递的情绪')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('读者实际感受')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('角色在哭')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('读者在爽')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('前反应')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('复现')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('后反应')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('以小搏大')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('士气如虹')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('理念之争')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('利益之争')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('理念认同')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('人设认同')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('追求和牺牲')
    expect(brief.emotional_arc_contract.failure_mode_guards.join('｜')).toContain('假虐')
    expect(brief.emotional_arc_contract.progressive_confrontation_rules.join('｜')).toContain('角力而非碾压')
    expect(brief.emotional_arc_contract.progressive_confrontation_rules.join('｜')).toContain('最后主角王炸')
    expect(brief.emotional_arc_contract.meme_plot_formula_rules.join('｜')).toContain('发生 -> 发展 -> 转折 -> 高潮')
    expect(brief.emotional_arc_contract.reader_desire_formula_rules.join('｜')).toContain('生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿')
    expect(brief.emotional_arc_contract.emotional_rhythm_curve_rules.join('｜')).toContain('温暖 -> 残忍 -> 善意 -> 真相')
    expect(brief.emotional_arc_contract.emotional_rhythm_curve_rules.join('｜')).toContain('不是所有故事都走完整曲线')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('世情/爽文')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('情感/虐心')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('古言/复仇')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('悬疑/推理')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('调动')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('先入为主')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('峰终定律')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('三层情绪')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('前反应')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('读者欲望四步公式')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('题材情感策略')
    expect(prompt).toContain('【情绪弧合同】')
    expect(prompt).toContain('执行 chapter_target.emotional_arc_contract')
    expect(prompt).toContain('情绪三板斧')
    expect(prompt).toContain('羁绊铺设')
    expect(prompt).toContain('情感撕裂')
    expect(prompt).toContain('余韵钝痛')
    expect(prompt).toContain('每 3-5 个小节')
    expect(prompt).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(prompt).toContain('爽点倒推法')
    expect(prompt).toContain('先确定用什么方式让读者满足')
    expect(prompt).toContain('装逼层级')
    expect(prompt).toContain('核心爽点')
    expect(prompt).toContain('偏离爽点')
    expect(prompt).toContain('多爽点密度')
    expect(prompt).toContain('不要拉长单个爽点')
    expect(prompt).toContain('情绪模块重组')
    expect(prompt).toContain('戏剧性会磨损')
    expect(prompt).toContain('情绪不会磨损')
    expect(prompt).toContain('换场景')
    expect(prompt).toContain('换对手')
    expect(prompt).toContain('加新情绪')
    expect(prompt).toContain('爽点递增对比')
    expect(prompt).toContain('先入为主')
    expect(prompt).toContain('峰终定律')
    expect(prompt).toContain('结尾情绪强度')
    expect(prompt).toContain('三层情绪')
    expect(prompt).toContain('读者实际感受')
    expect(prompt).toContain('角色在哭')
    expect(prompt).toContain('前反应')
    expect(prompt).toContain('复现')
    expect(prompt).toContain('后反应')
    expect(prompt).toContain('以小搏大')
    expect(prompt).toContain('理念矛盾')
    expect(prompt).toContain('理念之争')
    expect(prompt).toContain('追求和牺牲')
    expect(prompt).toContain('递进对抗')
    expect(prompt).toContain('角力而非碾压')
    expect(prompt).toContain('梗四段式')
    expect(prompt).toContain('发生 -> 发展 -> 转折 -> 高潮')
    expect(prompt).toContain('读者欲望四步公式')
    expect(prompt).toContain('生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿')
    expect(prompt).toContain('情绪拉扯曲线')
    expect(prompt).toContain('温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击')
    expect(prompt).toContain('题材情感策略')
    expect(prompt).toContain('世情/爽文')
    expect(prompt).toContain('情感/虐心')
    expect(prompt).toContain('古言/复仇')
    expect(prompt).toContain('悬疑/推理')
    expect(prompt).toContain('年代/亲情')
    expect(prompt).toContain('emotional_arc_checks')
    expect(prompt.indexOf('【情绪弧合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit emotional arc contract from scene emotion context', () => {
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角被诬告后在公开场合逐步反证，完成打脸翻盘。',
    }
    const contextPackage = {
      emotional_arc_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认调动、释放和爽感都有正文证据。'],
      },
      chapter_target: {
        chapter_no: 17,
        title: '审判庭反证',
        summary: '主角在公开审判庭从被诬告到拿出证据完成反证。',
        conflict: '对手当众羞辱并逼主角认罪，主角必须忍住压力等待证据。',
        emotional_curve: '压迫 -> 代价加速 -> 反证释放 -> 爽感',
        ending_hook: '真正的幕后证人从屏风后走出。',
        scene_cards: [
          {
            scene_no: 1,
            title: '公开羞辱',
            purpose: '把私下诬告升级到公开审判。',
            conflict: '长老逼主角认罪。',
            emotional_tone: '压迫和不该如此',
            reader_payoff: '读者替主角憋着等反击。',
          },
          {
            scene_no: 2,
            title: '证据反打',
            purpose: '用账本印记完成反证。',
            reversal: '账本反而证明对手调包。',
            emotional_tone: '释放和爽感',
            reader_payoff: '当众打脸，旁观者态度转变。',
            ending_hook_seed: '幕后证人出现。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.emotional_arc_contract.source).toBe('manual_incomplete')
    expect(brief.emotional_arc_contract.quality_checks).toEqual(['必须确认调动、释放和爽感都有正文证据。'])
    expect(brief.emotional_arc_contract.arc_shape).toContain('递进形')
    expect(brief.emotional_arc_contract.scene_emotion_steps.join('｜')).toContain('压迫和不该如此')
    expect(brief.emotional_arc_contract.scene_emotion_steps.join('｜')).toContain('释放和爽感')
    expect(brief.emotional_arc_contract.pressure_methods.join('｜')).toContain('公开升级')
    expect(brief.emotional_arc_contract.payoff_types.join('｜')).toContain('态度转变')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('影响范围')
    expect(brief.emotional_arc_contract.expectation_rules.join('｜')).toContain('断期待禁止')
    expect(brief.emotional_arc_contract.safety_rules.join('｜')).toContain('下行情节')
    expect(brief.emotional_arc_contract.bonding_setup_rules.join('｜')).toContain('具体物件')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('延迟真相法')
    expect(brief.emotional_arc_contract.lingering_aftertaste_rules.join('｜')).toContain('安静细节')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('先入为主')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('峰终定律')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('读者实际感受')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('前反应')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('理念之争')
  })

  test('preserves explicit camelCase emotional arc first-impression peak-end emotion-layer and ideology rules', () => {
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角被诬告后在公开场合逐步反证，完成打脸翻盘。',
    }
    const contextPackage = {
      emotionalArcContract: {
        source: 'manual_complete',
        firstImpressionRules: ['自定义先入为主：前100字先给核心矛盾。'],
        peakEndRules: ['自定义峰终定律：结尾情绪必须高于起点。'],
        emotionLayerRules: ['自定义三层情绪：角色情绪屈辱，文本传递隐忍，读者实际感受爽前蓄力。'],
        reactionStructureRules: ['自定义前反应-复现-后反应：先预知坏结果，再复现冲击，最后让主角振作。'],
        ideologicalConflictRules: ['自定义理念矛盾：把公平和权威的冲突写成主角与对手的原则碰撞。'],
      },
      chapter_target: {
        chapter_no: 17,
        title: '审判庭反证',
        summary: '主角在公开审判庭从被诬告到拿出证据完成反证。',
        conflict: '对手当众羞辱并逼主角认罪。',
        emotional_curve: '压迫 -> 反证释放 -> 爽感',
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.emotional_arc_contract.source).toBe('manual_complete')
    expect(brief.emotional_arc_contract.first_impression_rules).toEqual(['自定义先入为主：前100字先给核心矛盾。'])
    expect(brief.emotional_arc_contract.peak_end_rules).toEqual(['自定义峰终定律：结尾情绪必须高于起点。'])
    expect(brief.emotional_arc_contract.emotion_layer_rules).toEqual(['自定义三层情绪：角色情绪屈辱，文本传递隐忍，读者实际感受爽前蓄力。'])
    expect(brief.emotional_arc_contract.reaction_structure_rules).toEqual(['自定义前反应-复现-后反应：先预知坏结果，再复现冲击，最后让主角振作。'])
    expect(brief.emotional_arc_contract.ideological_conflict_rules).toEqual(['自定义理念矛盾：把公平和权威的冲突写成主角与对手的原则碰撞。'])
  })

  test('asks prose self review to enforce oh-story emotional three-blade methods', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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

  test('adds an oh-story reversal design contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '伪证账本',
      genre: '都市逆袭',
      synopsis: '主角被可靠证人和账本同时指控，最后用新证据证明账本被调包，证人身份也另有隐情。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 21,
        title: '证词翻面',
        summary: '可靠证人给出伪证，主角在高压审判里揭示账本被调包。',
        conflict: '众人相信证人身份，反派用旧账本逼主角认罪。',
        ending_hook: '证人摘下面具，露出失踪三年的旧部印记。',
        scene_cards: [
          {
            scene_no: 1,
            title: '可靠证词',
            purpose: '让读者相信证人和账本是铁证。',
            conflict: '主角被迫在认罪和交出底牌之间二选一。',
            information_gap: '证人为什么知道账本细节。',
          },
          {
            scene_no: 2,
            title: '矛盾证据',
            purpose: '新证据否定旧事实。',
            reversal: '账本页码错位，证明它被调包。',
            reader_payoff: '信息反转后，反派所有孝心表演变成自保。',
          },
          {
            scene_no: 3,
            title: '身份揭示',
            purpose: '证人身份反转并留下下一章冲突。',
            reversal: '证人不是外人，而是失踪旧部。',
            ending_hook_seed: '旧部印记只会出现在叛逃名单上。',
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
      { chapter_no: 21, title: '证词翻面' },
    )

    expect(brief.reversal_contract.version).toBe('oh_story_reversal_v1')
    expect(brief.reversal_contract.reversal_types.join('｜')).toContain('信息反转')
    expect(brief.reversal_contract.reversal_types.join('｜')).toContain('身份反转')
    expect(brief.reversal_contract.setup_requirements.join('｜')).toContain('3处暗示')
    expect(brief.reversal_contract.misdirection_methods.join('｜')).toContain('红鲱鱼')
    expect(brief.reversal_contract.timing_rules.join('｜')).toContain('70-85%')
    expect(brief.reversal_contract.face_slap_rhythm.join('｜')).toContain('打脸节奏')
    expect(confirmedContext.chapter_target.reversal_contract.quality_checks.join('｜')).toContain('3处暗示')
    expect(prompt).toContain('【反转设计合同】')
    expect(prompt).toContain('执行 chapter_target.reversal_contract')
    expect(prompt).toContain('反转类型')
    expect(prompt).toContain('误导技巧')
    expect(prompt).toContain('reversal_checks')
    expect(prompt.indexOf('【反转设计合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit reversal contract from scene reversal context', () => {
    const project = {
      title: '伪证账本',
      genre: '都市逆袭',
      synopsis: '主角被可靠证人和账本同时指控，最后用新证据证明账本被调包，证人身份也另有隐情。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 21,
        title: '证词翻面',
        summary: '可靠证人给出伪证，主角在高压审判里揭示账本被调包。',
        conflict: '众人相信证人身份，反派用旧账本逼主角认罪。',
        ending_hook: '证人摘下面具，露出失踪三年的旧部印记。',
        reversal_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认反转前有公平暗示，揭示后改变局势。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '可靠证词',
            purpose: '让读者相信证人和账本是铁证。',
            conflict: '主角被迫在认罪和交出底牌之间二选一。',
            information_gap: '证人为什么知道账本细节。',
          },
          {
            scene_no: 2,
            title: '矛盾证据',
            purpose: '新证据否定旧事实。',
            reversal: '账本页码错位，证明它被调包。',
            reader_payoff: '信息反转后，反派所有孝心表演变成自保。',
          },
          {
            scene_no: 3,
            title: '身份揭示',
            purpose: '证人身份反转并留下下一章冲突。',
            reversal: '证人不是外人，而是失踪旧部。',
            ending_hook_seed: '旧部印记只会出现在叛逃名单上。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.reversal_contract.source).toBe('manual_incomplete')
    expect(brief.reversal_contract.quality_checks).toEqual(['必须确认反转前有公平暗示，揭示后改变局势。'])
    expect(brief.reversal_contract.reversal_types.join('｜')).toContain('信息反转')
    expect(brief.reversal_contract.reversal_types.join('｜')).toContain('身份反转')
    expect(brief.reversal_contract.reversal_types).not.toContain('无反转')
    expect(brief.reversal_contract.setup_plan.join('｜')).toContain('证人为什么知道账本细节')
    expect(brief.reversal_contract.setup_plan.join('｜')).toContain('账本页码错位')
    expect(brief.reversal_contract.setup_plan.join('｜')).toContain('旧部印记')
    expect(brief.reversal_contract.misdirection_methods.join('｜')).toContain('红鲱鱼')
    expect(brief.reversal_contract.timing_rules.join('｜')).toContain('70-85%')
  })

  test('adds an oh-story showdown contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '审判台上的旧账',
      genre: '都市逆袭打脸',
      synopsis: '主角被旧账本构陷，在公开审判里放出底牌反制会长。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 22,
        title: '旧账反压',
        summary: '反派在审判台公开旧账本，主角用第二本账册和证人链完成打脸。',
        conflict: '会长铺好观众和长老席，逼主角当众认罪。',
        ending_hook: '长老席最上层的人第一次站起来。',
        scene_cards: [
          {
            scene_no: 1,
            title: '审判舞台',
            purpose: '铺设群众层、中间层、核心层的打脸舞台。',
            conflict: '会长让所有人相信旧账本是铁证。',
            reader_payoff: '读者等待主角底牌释放。',
          },
          {
            scene_no: 2,
            title: '底牌出手',
            purpose: '主角放出第二本账册，压制反派并改变长老席利益计算。',
            conflict: '会长试图把证据解释成伪造。',
            reader_payoff: '底牌放出后反派破防，群众震惊分层传递。',
            reversal: '证据链证明会长才是调包人。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-23T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 22, title: '旧账反压' },
    )

    expect(brief.showdown_contract.version).toBe('oh_story_showdown_v1')
    expect(brief.showdown_contract.payoff_release_rules.join('｜')).toContain('该爽不爽')
    expect(brief.showdown_contract.payoff_release_rules.join('｜')).toContain('反派就要受到对应的压制')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('三压一爆三震')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('友好势力')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('敌方势力')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('中立势力')
    expect(brief.showdown_contract.stage_chain_rules.join('｜')).toContain('群众层 -> 中间层 -> 核心层')
    expect(brief.showdown_contract.transmission_channel_rules.join('｜')).toContain('传递通道')
    expect(brief.showdown_contract.transmission_channel_rules.join('｜')).toContain('人际关系')
    expect(brief.showdown_contract.shock_chain_rules.join('｜')).toContain('基于自身利益和目标')
    expect(brief.showdown_contract.combat_design_rules.join('｜')).toContain('打斗是一场表演')
    expect(brief.showdown_contract.weak_over_strong_rules.join('｜')).toContain('信息差')
    expect(brief.showdown_contract.counterplay_layers.join('｜')).toContain('预判反制')
    expect(brief.showdown_contract.counterplay_layers.join('｜')).toContain('反预判')
    expect(brief.showdown_contract.emotion_rhythm_rules.join('｜')).toContain('急 -> 缓 -> 急')
    expect(brief.showdown_contract.trump_card_reserve_rules.join('｜')).toContain('2-3个未揭示的底牌')
    expect(brief.showdown_contract.trump_card_reserve_rules.join('｜')).toContain('每次只出1个')
    expect(brief.showdown_contract.trump_card_reserve_rules.join('｜')).toContain('新技能')
    expect(brief.showdown_contract.invincible_protagonist_rules.join('｜')).toContain('主角登场时一点都不能拖拉')
    expect(brief.showdown_contract.invincible_protagonist_rules.join('｜')).toContain('杀伐果断')
    expect(brief.showdown_contract.invincible_protagonist_rules.join('｜')).toContain('战力前置无敌')
    expect(confirmedContext.chapter_target.showdown_contract.quality_checks.join('｜')).toContain('爽点到位')
    expect(prompt).toContain('【高潮对抗合同】')
    expect(prompt).toContain('执行 chapter_target.showdown_contract')
    expect(prompt).toContain('爽点释放')
    expect(prompt).toContain('三压一爆三震')
    expect(prompt).toContain('友好势力')
    expect(prompt).toContain('传递通道')
    expect(prompt).toContain('震惊分层')
    expect(prompt).toContain('三层破局')
    expect(prompt).toContain('预判反制')
    expect(prompt).toContain('底牌管理')
    expect(prompt).toContain('未揭示底牌')
    expect(prompt).toContain('无敌文主角')
    expect(prompt).toContain('战力前置无敌')
    expect(prompt).toContain('showdown_checks')
    expect(prompt.indexOf('【高潮对抗合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('infers showdown contract from runtime chapterTarget scene cards when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '审判台上的旧账',
        genre: '都市逆袭打脸',
        synopsis: '主角被旧账本构陷，在公开审判里放出底牌反制会长。',
      },
      {
        chapter_target: {
          chapter_no: 22,
          title: '旧账反压',
          summary: '旧章节目标只保留基础信息。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 22,
          title: '旧账反压',
          sceneCards: [
            {
              sceneNo: 1,
              title: '运行时审判舞台',
              purpose: '铺设群众层、中间层、核心层的打脸舞台。',
              conflict: '会长让所有人相信旧账本是铁证。',
              readerPayoff: '底牌放出后反派破防，群众震惊分层传递。',
              reversal: '证据链证明会长才是调包人。',
            },
          ],
        },
      },
    )

    expect(brief.showdown_contract.version).toBe('oh_story_showdown_v1')
    expect(brief.showdown_contract.stage_chain_rules.join('｜')).toContain('群众层 -> 中间层 -> 核心层')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('三压一爆三震')
  })

  test('hydrates incomplete explicit showdown contract from scene payoff context', () => {
    const project = {
      title: '审判台上的旧账',
      genre: '都市逆袭打脸',
      synopsis: '主角被旧账本构陷，在公开审判里放出底牌反制会长。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 22,
        title: '旧账反压',
        summary: '反派在审判台公开旧账本，主角用第二本账册和证人链完成打脸。',
        conflict: '会长铺好观众和长老席，逼主角当众认罪。',
        showdown_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认底牌释放后反派被压制，不能反打主角。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '底牌出手',
            purpose: '主角放出第二本账册。',
            conflict: '会长试图把证据解释成伪造。',
            reader_payoff: '底牌放出后反派破防，群众震惊分层传递。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.showdown_contract.source).toBe('manual_incomplete')
    expect(brief.showdown_contract.quality_checks).toEqual(['必须确认底牌释放后反派被压制，不能反打主角。'])
    expect(brief.showdown_contract.payoff_release_rules.join('｜')).toContain('该爽不爽')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('三压一爆三震')
    expect(brief.showdown_contract.stage_chain_rules.join('｜')).toContain('人际关系铺垫')
    expect(brief.showdown_contract.transmission_channel_rules.join('｜')).toContain('传递通道')
    expect(brief.showdown_contract.shock_chain_rules.join('｜')).toContain('不是统一的“倒吸一口凉气”')
    expect(brief.showdown_contract.counterplay_layers.join('｜')).toContain('反预判')
    expect(brief.showdown_contract.trump_card_reserve_rules.join('｜')).toContain('每次只出1个')
    expect(brief.showdown_contract.invincible_protagonist_rules.join('｜')).toContain('主角登场时一点都不能拖拉')
    expect(brief.showdown_contract.revision_priorities.join('｜')).toContain('补爽点释放强度')
  })

  test('hydrates explicit showdown invincible protagonist rules from camel case input', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '审判台上的旧账',
        genre: '都市逆袭打脸',
        synopsis: '主角被旧账本构陷，在公开审判里放出底牌反制会长。',
      },
      {
        chapter_target: {
          chapter_no: 22,
          title: '旧账反压',
          summary: '反派在审判台公开旧账本，主角用第二本账册和证人链完成打脸。',
          conflict: '会长铺好观众和长老席，逼主角当众认罪。',
          showdown_contract: {
            source: 'manual_showdown',
            invincibleProtagonistRules: ['自定义：主角登场三句内完成压制。'],
          },
        },
      },
    )

    expect(brief.showdown_contract.source).toBe('manual_showdown')
    expect(brief.showdown_contract.invincible_protagonist_rules).toEqual(['自定义：主角登场三句内完成压制。'])
    expect(brief.showdown_contract.payoff_release_rules.join('｜')).toContain('该爽不爽')
  })

  test('adds an oh-story bridge unit contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '四章一桥的旧城账',
      genre: '都市商业逆袭',
      synopsis: '主角用旧城项目连续制造期待，在公开会上完成阶段兑现并开启下个目标。',
    }
    const contextPackage = {
      next_batch_brief: {
        batch_goal: '四章内完成旧城会审桥段，既兑现账本期待，又把新投资人目标挂上。',
        chapters: [
          { chapter_no: 21, role: '代入日常', goal: '旧城铺垫和角色互动' },
          { chapter_no: 22, role: '信息差', goal: '对手亮出旧账困境' },
          { chapter_no: 23, role: '拉扯增强', goal: '配角反应和主角开始装' },
          { chapter_no: 24, role: '兑现承接', goal: '公开会兑现并开启新目标' },
        ],
      },
      chapter_target: {
        chapter_no: 23,
        title: '旧城会审前夜',
        summary: '主角在旧城会审前夜发现对手账本漏洞，但先让配角承担反应和疑问。',
        conflict: '旧城投资人连续两章没有看到目标推进，对手又用新规阻碍主角入场。',
        ending_hook: '主角把第二份协议按在桌上，所有人终于意识到他要开始装了。',
        scene_cards: [
          {
            scene_no: 1,
            title: '会审前夜',
            purpose: '承接上一章信息差，展示旧城伙伴的焦虑。',
            conflict: '对手新规让主角无法直接发言。',
            reader_payoff: '读者等待协议底牌何时亮出。',
            ending_hook_seed: '主角只问了一句投资人席位还缺不缺人。',
          },
          {
            scene_no: 2,
            title: '协议压桌',
            purpose: '让主角开始装，但先不完全兑现。',
            conflict: '配角质疑主角是否又要拖延。',
            reader_payoff: '主角把协议压桌，开启下一章公开兑现。',
            ending_hook_seed: '门外传来新投资人的脚步声。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-23T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 23, title: '旧城会审前夜' },
    )

    expect(brief.bridge_unit_contract.version).toBe('oh_story_bridge_unit_v1')
    expect(brief.bridge_unit_contract.four_chapter_roles.join('｜')).toContain('四章一桥段')
    expect(brief.bridge_unit_contract.four_chapter_roles.join('｜')).toContain('结尾必须让主角开始装')
    expect(brief.bridge_unit_contract.expectation_chain_rules.join('｜')).toContain('高潮中埋钩子')
    expect(brief.bridge_unit_contract.fatigue_repair_rules.join('｜')).toContain('连续 2 章没有目标推进')
    expect(confirmedContext.chapter_target.bridge_unit_contract.transition_rules.join('｜')).toContain('连续小期待')
    expect(prompt).toContain('【桥段节奏合同】')
    expect(prompt).toContain('执行 chapter_target.bridge_unit_contract')
    expect(prompt).toContain('四章一桥段')
    expect(prompt).toContain('高潮中埋钩子')
    expect(prompt).toContain('bridge_unit_checks')
    expect(prompt.indexOf('【桥段节奏合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit bridge unit contract from continuity context', () => {
    const project = {
      title: '四章一桥的旧城账',
      genre: '都市商业逆袭',
      synopsis: '主角用旧城项目连续制造期待，在公开会上完成阶段兑现并开启下个目标。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 24,
        title: '公开兑现',
        summary: '主角在旧城公开会上兑现旧账本期待，同时给出下一阶段投资人目标。',
        conflict: '对手逼主角一次性证明全部资金来源。',
        bridge_unit_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认本章兑现旧期待前，先挂上新投资人的下一期待。'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.bridge_unit_contract.source).toBe('manual_incomplete')
    expect(brief.bridge_unit_contract.quality_checks).toEqual(['必须确认本章兑现旧期待前，先挂上新投资人的下一期待。'])
    expect(brief.bridge_unit_contract.four_chapter_roles.join('｜')).toContain('四章一桥段')
    expect(brief.bridge_unit_contract.climax_duration_rules.join('｜')).toContain('大高潮')
    expect(brief.bridge_unit_contract.transition_rules.join('｜')).toContain('连续小期待')
    expect(brief.bridge_unit_contract.revision_priorities.join('｜')).toContain('补连续期待')
  })

  test('adds an oh-story plot framework contract to route genre frameworks across planning stages', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '失业维修师的系统订单',
      genre: '都市系统升级',
      synopsis: '中年维修师绑定订单系统，通过任务、奖励、兑换和新任务循环翻身。',
      reference_config: {
        writing_bible: {
          golden_finger: '订单系统把维修任务转成经验、技能和工具奖励。',
          commercial_positioning: {
            selling_points: ['系统订单奖励', '客户态度反转', '维修协会打脸'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 5,
        title: '第一张协会黑名单',
        summary: '维修协会把主角拉进黑名单，主角必须用系统奖励的检测笔证明协会误判。',
        conflict: '协会会长公开宣布黑名单，客户和围观维修师都不敢让主角碰设备。',
        ending_hook: '系统弹出兑换页，提示下一单是医院备用电源。',
        scene_cards: [
          {
            scene_no: 1,
            title: '黑名单公布',
            purpose: '敌人阵营先出牌，制造协会权威压力。',
            conflict: '协会会长公开宣布主角没有维修资格。',
            reader_payoff: '读者看到主角被看低，等待系统奖励反打。',
          },
          {
            scene_no: 2,
            title: '检测笔反打',
            purpose: '主角阵营用系统奖励破解设备误判。',
            action_beats: ['检测笔点亮隐藏故障', '客户态度松动', '围观维修师开始议论'],
            reader_payoff: '任务奖励变成可见能力，客户态度反转。',
          },
          {
            scene_no: 3,
            title: '兑换新任务',
            purpose: '观众阵营震惊后，系统给出新任务和更高门槛。',
            reader_payoff: '主角获得工具升级和下一单期待。',
            ending_hook_seed: '医院备用电源任务进入倒计时。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-24T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 5, title: '第一张协会黑名单' },
    )

    expect(brief.plot_framework_contract.version).toBe('oh_story_plot_framework_v1')
    expect(brief.plot_framework_contract.genre_framework_route.primary_framework).toContain('RPG结构与奖励设计')
    expect(brief.plot_framework_contract.genre_framework_route.core_loop).toContain('任务→奖励→兑换→新任务')
    expect(brief.plot_framework_contract.selected_frameworks.join('｜')).toContain('RPG结构与奖励设计')
    expect(brief.plot_framework_contract.selected_frameworks.join('｜')).toContain('套路模板重复法')
    expect(brief.plot_framework_contract.selected_frameworks.join('｜')).toContain('框架与阵营手牌法')
    expect(brief.plot_framework_contract.stage_ownership.creation.join('｜')).toContain('题材→框架路由')
    expect(brief.plot_framework_contract.stage_ownership.outline.join('｜')).toContain('单段剧情结构模板')
    expect(brief.plot_framework_contract.stage_ownership.scene_card.join('｜')).toContain('阵营手牌法')
    expect(brief.plot_framework_contract.stage_ownership.prose.join('｜')).toContain('任务→奖励→兑换→新任务')
    expect(brief.plot_framework_contract.stage_ownership.revision.join('｜')).toContain('五不崩')
    expect(brief.plot_framework_contract.rpg_reward_loop.rules.join('｜')).toContain('奖励形式要多样化')
    expect(brief.plot_framework_contract.faction_hand_framework.rules.join('｜')).toContain('主角阵营')
    expect(brief.plot_framework_contract.faction_hand_framework.rules.join('｜')).toContain('敌人阵营')
    expect(brief.plot_framework_contract.faction_hand_framework.rules.join('｜')).toContain('观众阵营')
    expect(brief.plot_framework_contract.routine_variation_rules.join('｜')).toContain('场景更换')
    expect(brief.plot_framework_contract.global_no_collapse_checks.join('｜')).toContain('目标不缺失')
    expect(confirmedContext.chapter_target.plot_framework_contract.quality_checks.join('｜')).toContain('主线和支线错开节奏推进')
    expect(prompt).toContain('【剧情框架合同】')
    expect(prompt).toContain('执行 chapter_target.plot_framework_contract')
    expect(prompt).toContain('题材→框架路由')
    expect(prompt).toContain('RPG结构与奖励设计')
    expect(prompt).toContain('框架与阵营手牌法')
    expect(prompt).toContain('套路模板重复法')
    expect(prompt).toContain('五不崩')
    expect(prompt).toContain('plot_framework_checks')
    expect(prompt.indexOf('【剧情框架合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('adds an oh-story opening contract to early-chapter pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '规则妈妈们找上门',
      genre: '都市脑洞',
      synopsis: '中年失业的主角突然被三位病娇妈妈认领，系统要求他在七天内查清真正血缘。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '门外有三个妈妈',
        summary: '主角刚被裁员回家，门外同时出现三位自称母亲的人和血缘系统。',
        conflict: '主角必须在签字认亲和报警之间选择，否则系统倒计时清零。',
        ending_hook: '系统提示第一位妈妈的血缘匹配率是零。',
        scene_cards: [
          {
            scene_no: 1,
            title: '裁员回家',
            purpose: '300字内让主角带着中年危机登场。',
            conflict: '房租催缴和裁员通知同时压下来。',
            opening_hook: '李岚把裁员信塞进口袋时，门外响起三道一模一样的敲门声。',
          },
          {
            scene_no: 2,
            title: '三位妈妈',
            purpose: '用极端异常事件制造期待点。',
            reader_payoff: '1000字内出现血缘系统和三位妈妈的反常身份。',
            information_gap: '谁才是真正的母亲。',
          },
          {
            scene_no: 3,
            title: '血缘倒计时',
            purpose: '完成金手指基点并留下第一章钩子。',
            reader_payoff: '系统给出第一次检测。',
            ending_hook_seed: '第一位妈妈匹配率为零。',
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
      { chapter_no: 1, title: '门外有三个妈妈' },
    )

    expect(brief.opening_contract.version).toBe('oh_story_opening_v1')
    expect(brief.opening_contract.activation_scope).toContain('前3章')
    expect(brief.opening_contract.opening_strategy).toContain('危机开局')
    expect(brief.opening_contract.required_beats.join('｜')).toContain('300 字内主角登场')
    expect(brief.opening_contract.required_beats.join('｜')).toContain('1000 字内出现爽点或期待点')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('简单点')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('不能偏')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('要快')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('要爽')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('不能平')
    expect(brief.opening_contract.foundation_points.join('｜')).toContain('人设基点')
    expect(brief.opening_contract.foundation_points.join('｜')).toContain('金手指基点')
    expect(brief.opening_contract.forbidden_patterns.join('｜')).toContain('大段背景介绍')
    expect(confirmedContext.chapter_target.opening_contract.quality_checks.join('｜')).toContain('第一章必须说明')
    expect(prompt).toContain('【开篇设计合同】')
    expect(prompt).toContain('执行 chapter_target.opening_contract')
    expect(prompt).toContain('300 字内主角登场')
    expect(prompt).toContain('开头五要诀')
    expect(prompt).toContain('简单/不偏/快/爽/不平')
    expect(prompt).toContain('三大基点')
    expect(prompt).toContain('opening_checks')
    expect(prompt.indexOf('【开篇设计合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit opening contract from first chapter scene plan', () => {
    const project = {
      title: '规则妈妈们找上门',
      genre: '都市脑洞',
      synopsis: '中年失业的主角突然被三位病娇妈妈认领，系统要求他在七天内查清真正血缘。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '门外有三个妈妈',
        summary: '主角刚被裁员回家，门外同时出现三位自称母亲的人和血缘系统。',
        conflict: '主角必须在签字认亲和报警之间选择，否则系统倒计时清零。',
        ending_hook: '系统提示第一位妈妈的血缘匹配率是零。',
        opening_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认主角登场、期待点和金手指基点都在正文早段兑现。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '裁员回家',
            purpose: '300字内让主角带着中年危机登场。',
            conflict: '房租催缴和裁员通知同时压下来。',
            opening_hook: '李岚把裁员信塞进口袋时，门外响起三道一模一样的敲门声。',
          },
          {
            scene_no: 2,
            title: '三位妈妈',
            purpose: '用极端异常事件制造期待点。',
            reader_payoff: '1000字内出现血缘系统和三位妈妈的反常身份。',
            information_gap: '谁才是真正的母亲。',
          },
          {
            scene_no: 3,
            title: '血缘倒计时',
            purpose: '完成金手指基点并留下第一章钩子。',
            reader_payoff: '系统给出第一次检测。',
            ending_hook_seed: '第一位妈妈匹配率为零。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.opening_contract.source).toBe('manual_incomplete')
    expect(brief.opening_contract.quality_checks).toEqual(['必须确认主角登场、期待点和金手指基点都在正文早段兑现。'])
    expect(brief.opening_contract.opening_strategy).toContain('危机开局')
    expect(brief.opening_contract.opening_plan.join('｜')).toContain('三道一模一样的敲门声')
    expect(brief.opening_contract.opening_plan.join('｜')).toContain('血缘系统')
    expect(brief.opening_contract.opening_plan.join('｜')).toContain('系统给出第一次检测')
    expect(brief.opening_contract.required_beats.join('｜')).toContain('300 字内主角登场')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('简单点')
    expect(brief.opening_contract.foundation_points.join('｜')).toContain('金手指基点')
    expect(brief.opening_contract.information_priority.join('｜')).toContain('危机感')
  })

  test('adds an oh-story prose craft contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '雪夜反证',
      genre: '悬疑逆袭',
      synopsis: '主角在雪夜审讯里用账本、旧疤和具体数字拆穿伪证。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        title: '旧疤和八万块',
        summary: '主角在审讯室里通过旧疤、账本金额和对手动作识破伪证。',
        conflict: '对手逼主角签认罪书，主角必须从现场细节里找出破绽。',
        ending_hook: '账本夹层露出一张只写了一块钱的转账单。',
        scene_cards: [
          {
            scene_no: 1,
            title: '认罪书',
            purpose: '用认罪书和旧疤建立贴身视角。',
            conflict: '主角被按在桌前签字。',
            action_beats: ['手腕旧疤被桌沿压住', '笔尖停在认罪书上', '对手把账本推过来'],
            reader_payoff: '读者看到主角从身体细节里发现账本问题。',
          },
          {
            scene_no: 2,
            title: '八万块',
            purpose: '用具体金额推动反证。',
            conflict: '对手声称账本上八万块就是铁证。',
            reader_payoff: '数字变化暴露伪证。',
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
      { chapter_no: 12, title: '旧疤和八万块' },
    )

    expect(brief.prose_craft_contract.version).toBe('oh_story_prose_craft_v1')
    expect(brief.prose_craft_contract.pov_rules.join('｜')).toContain('深度限知')
    expect(brief.prose_craft_contract.expression_rules.join('｜')).toContain('身体细节替代情绪词')
    expect(brief.prose_craft_contract.scene_weaving_rules.join('｜')).toContain('三维度揉进')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('主语与名字节奏')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('段首、场景切换、多人同场、视角重置')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('每句都在报名字')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('指代不清')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('间接描写法')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('正面描写只是铺垫')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('侧面反应才是爽点')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('嚼饼')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('哄抢')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('三机位法')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('机位1')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('机位2')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('机位3')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('设定都由冲突引出')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('然后呢')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('每一段文字')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('信息点')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('立刻用下一个信息点接上')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('核心情绪')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('所有情节、人设、冲突')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('宏观')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('微观')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('白描')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('最少的字')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('准确的信息和情绪')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('两到三种感官')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('视觉/听觉/触觉/嗅觉/味觉')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('五感必须服务情绪')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('动态描写优于静态描写')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('动作和反应展现')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('环境不要大段铺陈')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('角色行动中穿插点染')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('镜头与分镜思维')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('每个段落 = 一个镜头')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('远景')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('中景')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('近景')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('特写')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('快节奏')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('慢节奏')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('场景切换与转场')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('相似物')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('相似五感')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('相似情绪')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('时间跳转')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('动作或物件衔接')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('空间跳转')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('声音或光影衔接')
    expect(brief.prose_craft_contract.rhythm_rules.join('｜')).toContain('一动一静')
    expect(brief.prose_craft_contract.object_number_rules.join('｜')).toContain('具体数字')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('一个主事件')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('3-5 个子事件')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('一个情绪变化')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('一条读者新获知的信息')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('3-5 轮对话交锋')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('小节结尾留一个钩子')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('下一节开头快速接续')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('情绪跨节递进')
    expect(brief.prose_craft_contract.section_density_rules.join('｜')).toContain('小节密度诊断')
    expect(brief.prose_craft_contract.anti_padding_rules.join('｜')).toContain('不得为凑字数加环境描写')
    expect(brief.prose_craft_contract.concept_anchor_rules.join('｜')).toContain('新名词')
    expect(brief.prose_craft_contract.concept_anchor_rules.join('｜')).toContain('动作反应')
    expect(brief.prose_craft_contract.concept_anchor_rules.join('｜')).toContain('物理后果')
    expect(brief.prose_craft_contract.description_limits.join('｜')).toContain('水分控制')
    expect(brief.prose_craft_contract.description_limits.join('｜')).toContain('删掉这段')
    expect(brief.prose_craft_contract.description_limits.join('｜')).toContain('读者不会困惑')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('高危词')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('仿佛')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('章末总结体')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('叠加式描写')
    expect(brief.prose_craft_contract.forbidden_patterns.join('｜')).toContain('他不知道的是')
    expect(confirmedContext.chapter_target.prose_craft_contract.quality_checks.join('｜')).toContain('每个详写子事件')
    expect(confirmedContext.chapter_target.prose_craft_contract.quality_checks.join('｜')).toContain('偏短小节')
    expect(prompt).toContain('【正文工艺合同】')
    expect(prompt).toContain('执行 chapter_target.prose_craft_contract')
    expect(prompt).toContain('身体细节替代情绪词')
    expect(prompt).toContain('三维度揉进')
    expect(prompt).toContain('subject_name_rhythm_rules')
    expect(prompt).toContain('主语与名字节奏')
    expect(prompt).toContain('段中用代词/省略流动')
    expect(prompt).toContain('间接描写法')
    expect(prompt).toContain('侧面反应')
    expect(prompt).toContain('不要直接宣布')
    expect(prompt).toContain('三机位法')
    expect(prompt).toContain('机位1')
    expect(prompt).toContain('机位2')
    expect(prompt).toContain('机位3')
    expect(prompt).toContain('然后呢')
    expect(prompt).toContain('每段')
    expect(prompt).toContain('信息点')
    expect(prompt).toContain('核心情绪')
    expect(prompt).toContain('情节、人设、冲突')
    expect(prompt).toContain('每个细节')
    expect(prompt).toContain('白描')
    expect(prompt).toContain('五感')
    expect(prompt).toContain('两到三种感官')
    expect(prompt).toContain('服务情绪')
    expect(prompt).toContain('动态描写优于静态描写')
    expect(prompt).toContain('动作和反应')
    expect(prompt).toContain('角色行动中穿插点染')
    expect(prompt).toContain('镜头与分镜思维')
    expect(prompt).toContain('远景')
    expect(prompt).toContain('中景')
    expect(prompt).toContain('近景')
    expect(prompt).toContain('特写')
    expect(prompt).toContain('短句、短段、密集动作')
    expect(prompt).toContain('场景切换与转场')
    expect(prompt).toContain('相似物')
    expect(prompt).toContain('动作或物件')
    expect(prompt).toContain('声音或光影')
    expect(prompt).toContain('小节内部结构')
    expect(prompt).toContain('一个主事件')
    expect(prompt).toContain('3-5 个子事件')
    expect(prompt).toContain('下一节开头快速接续')
    expect(prompt).toContain('情绪跨节递进')
    expect(prompt).toContain('小节密度诊断')
    expect(prompt).toContain('新概念锚点')
    expect(prompt).toContain('新名词')
    expect(prompt).toContain('动作反应')
    expect(prompt).toContain('物理后果')
    expect(prompt).toContain('description_limits')
    expect(prompt).toContain('水分控制')
    expect(prompt).toContain('删掉这段')
    expect(prompt).toContain('anti_ai_smell_rules')
    expect(prompt).toContain('高危词')
    expect(prompt).toContain('章末总结体')
    expect(prompt).toContain('叠加式描写')
    expect(prompt).toContain('prose_craft_checks')
    expect(prompt.indexOf('【正文工艺合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
    const proseCraftSectionStart = prompt.indexOf('【正文工艺合同】')
    const proseCraftSectionEnd = prompt.indexOf('【语气标点谱系合同】')
    const proseCraftSection = prompt.slice(proseCraftSectionStart, proseCraftSectionEnd)
    expect(proseCraftSection.length).toBeLessThan(4300)
    expect(proseCraftSection).not.toContain('"pov_rules"')
    expect(proseCraftSection).not.toContain('"quality_checks"')
  })

  test('hydrates incomplete explicit prose craft contract from scene anchors', () => {
    const project = {
      title: '雪夜反证',
      genre: '悬疑逆袭',
      synopsis: '主角在雪夜审讯里用账本、旧疤和具体数字拆穿伪证。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        title: '旧疤和八万块',
        summary: '主角在审讯室里通过旧疤、账本金额和对手动作识破伪证。',
        conflict: '对手逼主角签认罪书，主角必须从现场细节里找出破绽。',
        ending_hook: '账本夹层露出一张只写了一块钱的转账单。',
        prose_craft_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认动作、身体细节和数字都承担剧情功能。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '认罪书',
            purpose: '用认罪书和旧疤建立贴身视角。',
            conflict: '主角被按在桌前签字。',
            action_beats: ['手腕旧疤被桌沿压住', '笔尖停在认罪书上', '对手把账本推过来'],
            reader_payoff: '读者看到主角从身体细节里发现账本问题。',
          },
          {
            scene_no: 2,
            title: '八万块',
            purpose: '用具体金额推动反证。',
            conflict: '对手声称账本上八万块就是铁证。',
            reader_payoff: '数字变化暴露伪证。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.prose_craft_contract.source).toBe('manual_incomplete')
    expect(brief.prose_craft_contract.quality_checks).toEqual(['必须确认动作、身体细节和数字都承担剧情功能。'])
    expect(brief.prose_craft_contract.scene_anchors.join('｜')).toContain('手腕旧疤被桌沿压住')
    expect(brief.prose_craft_contract.scene_anchors.join('｜')).toContain('对手把账本推过来')
    expect(brief.prose_craft_contract.scene_anchors.join('｜')).toContain('八万块')
    expect(brief.prose_craft_contract.scene_anchors.join('｜')).toContain('一块钱的转账单')
    expect(brief.prose_craft_contract.pov_rules.join('｜')).toContain('深度限知')
    expect(brief.prose_craft_contract.expression_rules.join('｜')).toContain('身体细节替代情绪词')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('主语与名字节奏')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('间接描写法')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('三机位法')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('然后呢')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('核心情绪')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('白描')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('动态描写优于静态描写')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('镜头与分镜思维')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('场景切换与转场')
    expect(brief.prose_craft_contract.object_number_rules.join('｜')).toContain('具体数字')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('一个主事件')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('下一节开头快速接续')
    expect(brief.prose_craft_contract.section_density_rules.join('｜')).toContain('小节密度诊断')
    expect(brief.prose_craft_contract.anti_padding_rules.join('｜')).toContain('不得为凑字数加环境描写')
    expect(brief.prose_craft_contract.concept_anchor_rules.join('｜')).toContain('新名词')
    expect(brief.prose_craft_contract.description_limits.join('｜')).toContain('水分控制')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('高危词')
  })

  test('preserves explicit camelCase prose craft subject-name rhythm indirect description three-camera then-what core emotion baimiao sensory dynamic shot transition description-limit and anti-ai rules', () => {
    const project = {
      title: '雪夜反证',
      genre: '悬疑逆袭',
      synopsis: '主角在雪夜审讯里用账本、旧疤和具体数字拆穿伪证。',
    }
    const contextPackage = {
      proseCraftContract: {
        source: 'manual_complete',
        subjectNameRhythmRules: ['自定义主语与名字节奏：段首点名，段中用代词和动作承接，关键转折再点名。'],
        indirectDescriptionRules: ['自定义间接描写法：不要说证据厉害，用旁观者停筷、反派改口和熟人后退证明爽点。'],
        threeCameraRules: ['自定义三机位法：机位1贴主角手上动作，机位2给旁观者退后和环境变化，机位3只补一句冲突触发的设定。'],
        thenWhatRules: ['自定义然后呢基点法：每段最后一个信息点必须引出下一动作、下一疑问或下一反应，不能写成死段。'],
        coreEmotionAlignmentRules: ['自定义核心情绪对齐：每个动作、物件、冲突和配角反应都必须服务复仇被认可的读者情绪。'],
        baimiaoSensoryRules: ['自定义白描五感：只保留最准确的动作名词和触觉/听觉锚点，所有感官都服务审判压迫感。'],
        dynamicDescriptionRules: ['自定义动态描写：人物特征只用动作和反应展现，环境只在角色行动中穿插点染。'],
        shotRhythmRules: ['自定义镜头节奏：冲突用近景和特写压短句，余波用中景和长句放慢，不连续远景铺环境。'],
        transitionBridgeRules: ['自定义转场：时间跳转用账本翻页或钥匙落掌承接，空间跳转用门缝光和脚步声带到新地点。'],
        descriptionLimits: ['自定义描写限额：删掉不影响读者理解的环境句，只保留伏笔、氛围营造或角色互动中的暗流。'],
        antiAiSmellRules: ['自定义去AI味：清掉仿佛、一丝、深吸一口气、章末总结体和叠加式描写。'],
      },
      chapter_target: {
        chapter_no: 12,
        title: '旧疤和八万块',
        summary: '主角在审讯室里通过旧疤、账本金额和对手动作识破伪证。',
        conflict: '对手逼主角签认罪书，主角必须从现场细节里找出破绽。',
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.prose_craft_contract.source).toBe('manual_complete')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules).toEqual(['自定义主语与名字节奏：段首点名，段中用代词和动作承接，关键转折再点名。'])
    expect(brief.prose_craft_contract.indirect_description_rules).toEqual(['自定义间接描写法：不要说证据厉害，用旁观者停筷、反派改口和熟人后退证明爽点。'])
    expect(brief.prose_craft_contract.three_camera_rules).toEqual(['自定义三机位法：机位1贴主角手上动作，机位2给旁观者退后和环境变化，机位3只补一句冲突触发的设定。'])
    expect(brief.prose_craft_contract.then_what_rules).toEqual(['自定义然后呢基点法：每段最后一个信息点必须引出下一动作、下一疑问或下一反应，不能写成死段。'])
    expect(brief.prose_craft_contract.core_emotion_alignment_rules).toEqual(['自定义核心情绪对齐：每个动作、物件、冲突和配角反应都必须服务复仇被认可的读者情绪。'])
    expect(brief.prose_craft_contract.baimiao_sensory_rules).toEqual(['自定义白描五感：只保留最准确的动作名词和触觉/听觉锚点，所有感官都服务审判压迫感。'])
    expect(brief.prose_craft_contract.dynamic_description_rules).toEqual(['自定义动态描写：人物特征只用动作和反应展现，环境只在角色行动中穿插点染。'])
    expect(brief.prose_craft_contract.shot_rhythm_rules).toEqual(['自定义镜头节奏：冲突用近景和特写压短句，余波用中景和长句放慢，不连续远景铺环境。'])
    expect(brief.prose_craft_contract.transition_bridge_rules).toEqual(['自定义转场：时间跳转用账本翻页或钥匙落掌承接，空间跳转用门缝光和脚步声带到新地点。'])
    expect(brief.prose_craft_contract.description_limits).toEqual(['自定义描写限额：删掉不影响读者理解的环境句，只保留伏笔、氛围营造或角色互动中的暗流。'])
    expect(brief.prose_craft_contract.anti_ai_smell_rules).toEqual(['自定义去AI味：清掉仿佛、一丝、深吸一口气、章末总结体和叠加式描写。'])
  })

  test('adds an oh-story quality audit contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '长夜账本',
      genre: '悬疑复仇',
      synopsis: '主角分章释放证据，逼反派从得意到自爆。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        title: '第二份证据',
        summary: '主角放出第二份证据，让反派第一次失去主动。',
        conflict: '反派试图用新设定解释旧账本，主角必须证明这不是水剧情而是局势变化。',
        ending_hook: '最后一页账本指向第三个证人。',
        scene_cards: [
          {
            scene_no: 1,
            title: '证据开场',
            purpose: '开头有钩子并推进核心事件。',
            conflict: '反派抢先宣布账本无效。',
            reader_payoff: '第二份证据改变局势。',
          },
          {
            scene_no: 2,
            title: '局势变化',
            purpose: '让关系和主线至少推进一项。',
            conflict: '旁观者开始倒向主角。',
            reader_payoff: '反派逼格被削弱但仍有后手。',
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
      { chapter_no: 16, title: '第二份证据' },
    )

    expect(brief.quality_audit_contract.version).toBe('oh_story_quality_audit_v1')
    expect(brief.quality_audit_contract.structure_checks.join('｜')).toContain('开头有钩子')
    expect(brief.quality_audit_contract.chapter_purpose_rules.join('｜')).toContain('目的词')
    expect(brief.quality_audit_contract.chapter_purpose_rules.join('｜')).toContain('铺垫/高潮/爽点/打脸')
    expect(brief.quality_audit_contract.progression_checks.join('｜')).toContain('删掉这章')
    expect(brief.quality_audit_contract.information_checks.join('｜')).toContain('一章不超 3 个新概念')
    expect(brief.quality_audit_contract.event_content_rules.join('｜')).toContain('事件内容比重不能小于一半')
    expect(brief.quality_audit_contract.event_content_rules.join('｜')).toContain('设定尽量通过事件演绎')
    expect(brief.quality_audit_contract.longform_checks.join('｜')).toContain('最近 5 章')
    expect(brief.quality_audit_contract.five_dimension_rubric.join('｜')).toContain('核心一致度')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('发现比告知爽十倍')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('隐性展示')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('开头暗示')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('中间深化')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('高潮爆发')
    expect(brief.quality_audit_contract.phase_checklist.map((item: any) => item.phase)).toEqual([
      '写前目的锁定',
      '开篇抓取',
      '中段推进',
      '信息负载',
      '章尾拉力',
      '连载连续性',
      '精修策略',
    ])
    expect(brief.quality_audit_contract.phase_checklist[0].receipt_keys).toEqual(['quality_audit_checks'])
    expect(brief.quality_audit_contract.phase_checklist[1].receipt_keys).toEqual(['structure_checks', 'opening_checks'])
    expect(brief.quality_audit_contract.phase_checklist[2].receipt_keys).toEqual(['progression_checks', 'quality_audit_checks'])
    expect(brief.quality_audit_contract.phase_checklist[3].receipt_keys).toEqual(['information_checks'])
    expect(brief.quality_audit_contract.phase_checklist[4].receipt_keys).toEqual(['structure_checks', 'chapter_hook_checks'])
    expect(brief.quality_audit_contract.phase_checklist[5].receipt_keys).toEqual(['longform_checks', 'state_tracking_checks'])
    expect(brief.quality_audit_contract.phase_checklist[6].receipt_keys).toEqual(['quality_audit_checks', 'prose_craft_checks'])
    expect(brief.quality_audit_contract.revision_strategies.join('｜')).toContain('rewrite')
    expect(confirmedContext.chapter_target.quality_audit_contract.quality_checks.join('｜')).toContain('五维评分')
    expect(prompt).toContain('【质量诊断合同】')
    expect(prompt).toContain('执行 chapter_target.quality_audit_contract')
    expect(prompt).toContain('五维评分标准')
    expect(prompt).toContain('章纲目的词')
    expect(prompt).toContain('水文检测')
    expect(prompt).toContain('事件内容比重')
    expect(prompt).toContain('设定尽量通过事件演绎')
    expect(prompt).toContain('卖点表达')
    expect(prompt).toContain('发现比告知爽十倍')
    expect(prompt).toContain('开头暗示')
    expect(prompt).toContain('中间深化')
    expect(prompt).toContain('高潮爆发')
    expect(prompt).toContain('阶段质量清单')
    expect(prompt).toContain('写前目的锁定 -> quality_audit_checks')
    expect(prompt).toContain('开篇抓取 -> structure_checks/opening_checks')
    expect(prompt).toContain('中段推进 -> progression_checks/quality_audit_checks')
    expect(prompt).toContain('信息负载 -> information_checks')
    expect(prompt).toContain('章尾拉力 -> structure_checks/chapter_hook_checks')
    expect(prompt).toContain('连载连续性 -> longform_checks/state_tracking_checks')
    expect(prompt).toContain('精修策略 -> quality_audit_checks/prose_craft_checks')
    expect(prompt).toContain('quality_audit_checks')
    expect(prompt.indexOf('【质量诊断合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit quality audit contract from chapter focus', () => {
    const project = {
      title: '长夜账本',
      genre: '悬疑复仇',
      synopsis: '主角分章释放证据，逼反派从得意到自爆。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        title: '第二份证据',
        summary: '主角放出第二份证据，让反派第一次失去主动。',
        conflict: '反派试图用新设定解释旧账本，主角必须证明这不是水剧情而是局势变化。',
        ending_hook: '最后一页账本指向第三个证人。',
        quality_audit_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认本章不可删除，且最低分维度有精修策略。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '证据开场',
            purpose: '开头有钩子并推进核心事件。',
            conflict: '反派抢先宣布账本无效。',
            reader_payoff: '第二份证据改变局势。',
          },
          {
            scene_no: 2,
            title: '局势变化',
            purpose: '让关系和主线至少推进一项。',
            conflict: '旁观者开始倒向主角。',
            reader_payoff: '反派逼格被削弱但仍有后手。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.quality_audit_contract.source).toBe('manual_incomplete')
    expect(brief.quality_audit_contract.quality_checks).toEqual(['必须确认本章不可删除，且最低分维度有精修策略。'])
    expect(brief.quality_audit_contract.chapter_focus.join('｜')).toContain('第二份证据')
    expect(brief.quality_audit_contract.chapter_focus.join('｜')).toContain('局势变化')
    expect(brief.quality_audit_contract.chapter_focus.join('｜')).toContain('最后一页账本指向第三个证人')
    expect(brief.quality_audit_contract.chapter_focus.join('｜')).toContain('第二份证据改变局势')
    expect(brief.quality_audit_contract.structure_checks.join('｜')).toContain('开头有钩子')
    expect(brief.quality_audit_contract.chapter_purpose_rules.join('｜')).toContain('目的词')
    expect(brief.quality_audit_contract.revision_strategies.join('｜')).toContain('rewrite')
    expect(brief.quality_audit_contract.five_dimension_rubric.join('｜')).toContain('核心一致度')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('发现比告知爽十倍')
    expect(brief.quality_audit_contract.phase_checklist.map((item: any) => item.phase)).toContain('写前目的锁定')
  })

  test('detects oh-story new concept overload from explicit chapter usage', () => {
    const checks = scanNewConceptOverloadRisks({
      setting_context: {
        chapter_usage: [
          { name: '镜州旧印', usage_type: 'introduce', summary: '首次引入旧印规则。' },
          { name: '血契账本', usage_type: 'new_concept', summary: '新增账本验血设定。' },
          { name: '盐商暗码', status: '首次引入', summary: '第一次出现暗码。' },
          { name: '夜巡司令牌', is_new: true, summary: '新道具。' },
          { name: '边军腰牌', usage_type: 'advance', summary: '已有伏笔推进。' },
        ],
      },
      storyline_context: {
        chapter_usage: [
          { name: '旧臣背刺线', usage_type: 'plant', summary: '已有主线种子。' },
        ],
      },
    })

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('quality_audit_new_concept_overload')
    expect(checks[0].status).toBe('fail')
    expect(checks[0].evidence).toContain('镜州旧印')
    expect(checks[0].evidence).toContain('夜巡司令牌')
    expect(checks[0].fix).toContain('最多保留 3 个')
  })

  test('detects new concepts introduced without an immediate action or consequence anchor', () => {
    const contextPackage = {
      setting_context: {
        chapter_usage: [
          { name: '蓝晶', usage_type: 'new_concept', summary: '首次出现的记忆载体。' },
        ],
      },
    }
    const looseText = [
      '沈砚看见蓝晶。',
      '蓝晶是旧王朝留下来的记忆器，源于三百年前的祭司制度，分为七阶九品。',
      '这个设定以后会有用。',
    ].join('\n')
    const anchoredText = [
      '林青禾把蓝晶按上太阳穴。',
      '陌生人的记忆碎片在她眼前炸开，旧账本缺页的位置随之浮出来。',
      '她捂住鼻血，只说：“它能找回被删掉的证据。”',
    ].join('\n')

    const looseChecks = scanNewConceptAnchorRisks(contextPackage, looseText)
    const anchoredChecks = scanNewConceptAnchorRisks(contextPackage, anchoredText)

    expect(looseChecks).toHaveLength(1)
    expect(looseChecks[0].key).toBe('prose_craft_new_concept_anchor_missing')
    expect(looseChecks[0].status).toBe('warn')
    expect(looseChecks[0].evidence).toContain('蓝晶')
    expect(looseChecks[0].fix).toContain('动作反应')
    expect(looseChecks[0].fix).toContain('物理后果')
    expect(anchoredChecks).toHaveLength(0)
  })

  test('detects economic or power scale without ordinary-person anchors', () => {
    const checks = scanEconomicPowerScaleAnchorRisks([
      '他一口气拿出三千万灵石，又把战力推到九万点，众人全都沉默。',
      '执事看见账册上的数字，只说这次赌局已经结束。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('quality_audit_scale_anchor_missing')
    expect(checks[0].label).toContain('尺度锚点')
    expect(checks[0].status).toBe('warn')
    expect(checks[0].evidence).toContain('三千万灵石')
    expect(checks[0].evidence).toContain('九万点')
    expect(checks[0].fix).toContain('普通人')
    expect(checks[0].fix).toContain('收入')
    expect(checks[0].fix).toContain('日常尺度')
  })

  test('does not flag economic or power scale when ordinary anchors are visible', () => {
    const checks = scanEconomicPowerScaleAnchorRisks([
      '三千万灵石相当于外门弟子三百年月俸，林砚听见账房伙计倒吸气。',
      '他的战力推到九万点，负责测评的杂役低头看了看自己一年工资才够换一次入门丹。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects vague quantity weight where oh-story expects concrete numbers', () => {
    const checks = scanVagueQuantityWeightRisks([
      '沈栀看着账单，想起姐姐为了她欠了很多钱，也等了很久。',
      '',
      '姐夫转来的钱不多，她却把那条消息翻了无数次。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_vague_quantity_weight_1_2')
    expect(checks[0].label).toBe('模糊数字重量扫描')
    expect(checks[0].evidence).toContain('很多钱')
    expect(checks[0].evidence).toContain('很久')
    expect(checks[0].fix).toContain('金额')
    expect(checks[0].fix).toContain('年限')
    expect(checks[0].fix).toContain('次数')
  })

  test('does not flag quantity weight when concrete amount duration and repetition are visible', () => {
    const checks = scanVagueQuantityWeightRisks([
      '沈栀看着八万块账单，想起姐姐为了她还了三年，也等了二十个月。',
      '姐夫只转来一块钱，她却把那条消息翻了十七次。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic vague quantity weight risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicVagueQuantityWeightChecks = scanVagueQuantityWeightRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicVagueQuantityWeightChecks')
  })

  test('builds an oh-story revision strategy brief from failed quality checks', () => {
    const brief = buildRevisionStrategyBrief({
      quality_audit_checks: [
        {
          key: 'quality_audit_core_consistency',
          label: '核心一致度',
          status: 'fail',
          evidence: '核心冲突从账本验血变成了闲聊。',
          fix: '围绕账本验血重写对峙段。',
          strategy: 'rewrite',
        },
        {
          key: 'quality_audit_new_concept_overload',
          label: '新概念负载',
          status: 'warn',
          evidence: '本章新增 5 个设定名。',
          fix: '最多保留 3 个新概念，其余延后。',
          strategy: 'compress',
        },
      ],
      deslop_checks: [
        {
          gate: 'Gate F',
          status: 'fail',
          evidence: '更大的风暴即将来临。',
          fix: '改成角色当下能感知的具体威胁。',
        },
      ],
      prose_craft_checks: [
        {
          key: 'emotion_telling',
          status: 'warn',
          evidence: '他感到一阵悲伤。',
          fix: '改成身体动作和环境交互。',
        },
      ],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'compress', 'de_ai'])
    expect(brief.directives.join('｜')).toContain('围绕账本验血重写对峙段')
    expect(brief.directives.join('｜')).toContain('最多保留 3 个新概念')
    expect(brief.directives.join('｜')).toContain('去AI味')
    expect(brief.reasons.join('｜')).toContain('核心一致度')
    expect(brief.reasons.join('｜')).toContain('Gate F')
  })

  test('uses scene-card serial risk repair checks to choose rewrite revision strategy', () => {
    const brief = buildRevisionStrategyBrief({
      serial_risk_repair_checks: [
        {
          key: 'scene_serial_risk_repair_1_missing',
          label: '场景近章风险修复检查',
          status: 'warn',
          evidence: '场景1标注 two_chapter_momentum_stall，但正文只复盘账册，没有目标推进、新信息或关系变化。',
          fix: '把账册新证据写成主角逼盟友改口的可见事件，并让盟友关系发生明确变化。',
        },
      ],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite'])
    expect(brief.reasons.join('｜')).toContain('场景近章风险修复检查')
    expect(brief.directives.join('｜')).toContain('账册新证据')
    expect(brief.directives.join('｜')).toContain('盟友关系发生明确变化')
  })

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

  test('carries reader retention execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二声广播' },
      [
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '第二声广播' },
      ],
      [
        {
          id: 217,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:16:30.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                reader_retention_checks: [
                  {
                    key: 'reward_randomness_gap',
                    label: '随机奖励不足',
                    status: 'fail',
                    retention_engine: 'Hook上瘾模型 + 留存双引擎',
                    emotional_payoff: '主角救下门外学生后获得半句感谢和同名恐惧，而不是只确认身份。',
                    information_hunger: '广播来源只给“第二个同名者”线索，保留谁在播报的问号。',
                    page_turn_question: '第二个和主角同名的人为什么会提前出现在广播里？',
                    evidence: '本章只确认学生身份，没有额外线索、沉没投入和章尾信息差。',
                    fix: '下一章必须补随机奖励、沉没投入和章尾翻页问题，让广播来源卡到最后300字。',
                    remaining_risk: '不能再让身份确认后追读饥饿归零。',
                  },
                  {
                    key: 'payoff_ok',
                    label: '即时回报',
                    status: 'pass',
                    retention_engine: '已兑现。',
                    emotional_payoff: '已兑现。',
                    information_hunger: '已兑现。',
                    page_turn_question: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
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
        title: '第二声广播',
        summary: '主角追问门外学生，并听见第二个同名者的广播。',
        conflict: '门外学生给出半句线索，广播却提前念出另一个同名者。',
        ending_hook: '广播里出现第二个和主角同名的人。',
        scene_cards: [
          { scene_no: 1, title: '第二声广播', reader_payoff: '追读留存字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:16:30.000Z',
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
      { chapter_no: 3, title: '第二声广播' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：追读留存缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_retention_checks.随机奖励不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('retention_engine=Hook上瘾模型 + 留存双引擎')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotional_payoff=主角救下门外学生后获得半句感谢')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('information_hunger=广播来源只给“第二个同名者”线索')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('page_turn_question=第二个和主角同名的人为什么会提前出现在广播里')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('即时回报')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('retention_engine')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('emotional_payoff')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('page_turn_question')
    expect(prompt).toContain('reader_retention_checks.随机奖励不足')
    expect(prompt).toContain('不能再让身份确认后追读饥饿归零')
  })

  test('carries target reader execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '规则反制' },
      [
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '规则反制' },
      ],
      [
        {
          id: 218,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:17:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                target_reader_checks: [
                  {
                    key: 'reader_desire_missing',
                    label: '目标读者爽点缺席',
                    status: 'fail',
                    target_reader_profile: '规则怪谈爽文读者，想看主角用超人能力反制规则漏洞。',
                    reader_desire: '看主角识破广播规则，利用力量和规则边界反将一军。',
                    emotion_gap: '前章只压迫主角，没有给读者“我也看懂规则”的参与感。',
                    chapter_hit: '本章必须让主角用门槛白线反制广播判定。',
                    platform_taste: '快节奏、强钩子、规则反制爽点，少解释设定。',
                    evidence: '本章一直解释门外学生来历，没有命中规则反制爽点。',
                    fix: '下一章必须先给目标读者能立刻看懂的规则漏洞，再让主角用超人能力反制。',
                    remaining_risk: '不能再把目标读者想看的反制爽点写成背景说明。',
                  },
                  {
                    key: 'platform_taste_ok',
                    label: '平台口味',
                    status: 'pass',
                    target_reader_profile: '已兑现。',
                    reader_desire: '已兑现。',
                    emotion_gap: '已兑现。',
                    chapter_hit: '已兑现。',
                    platform_taste: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
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
        title: '规则反制',
        summary: '主角识破广播规则漏洞，用门槛白线反制判定。',
        conflict: '广播试图把门外学生的身份判定转嫁给主角。',
        ending_hook: '白线另一侧出现第二个同名者的脚印。',
        scene_cards: [
          { scene_no: 1, title: '白线反制', reader_payoff: '目标读者字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:17:00.000Z',
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
      { chapter_no: 3, title: '规则反制' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：目标读者缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('target_reader_checks.目标读者爽点缺席')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('target_reader_profile=规则怪谈爽文读者')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_desire=看主角识破广播规则')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotion_gap=前章只压迫主角')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_hit=本章必须让主角用门槛白线反制广播判定')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('platform_taste=快节奏、强钩子、规则反制爽点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('平台口味')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('target_reader_profile')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('reader_desire')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('chapter_hit')
    expect(prompt).toContain('target_reader_checks.目标读者爽点缺席')
    expect(prompt).toContain('不能再把目标读者想看的反制爽点写成背景说明')
  })

  test('carries genre positioning execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '白线反制' },
      [
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '白线反制' },
      ],
      [
        {
          id: 219,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:17:30.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                genre_positioning_checks: [
                  {
                    key: 'genre_promise_drift',
                    label: '题材承诺漂移',
                    status: 'fail',
                    genre_tag: '规则怪谈 + 超人爽文',
                    core_hook: '超人能力不是横推，而是用来反制规则漏洞。',
                    type_formula: '规则压迫 -> 发现漏洞 -> 超人能力执行反制 -> 新规则门槛。',
                    genre_strength: '强规则、强反制、强章尾门槛，少日常解释。',
                    book_title_blurb_alignment: '标题和简介都承诺超人规则反制，正文不能转成校园日常推理。',
                    evidence: '本章大量解释门外学生来历，题材长板没有进入正文事件。',
                    fix: '下一章必须把白线规则和超人能力写成反制桥段，章尾继续抬新规则门槛。',
                    remaining_risk: '不能再把题材承诺漂成普通校园悬疑。',
                  },
                  {
                    key: 'genre_strength_ok',
                    label: '题材长板',
                    status: 'pass',
                    genre_tag: '已兑现。',
                    core_hook: '已兑现。',
                    type_formula: '已兑现。',
                    genre_strength: '已兑现。',
                    book_title_blurb_alignment: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
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
        title: '白线反制',
        summary: '主角用超人能力测试门槛白线，反制广播判定。',
        conflict: '广播规则试图逼主角横推失败，主角必须发现漏洞。',
        ending_hook: '白线背后出现新规则门槛。',
        scene_cards: [
          { scene_no: 1, title: '白线反制', reader_payoff: '题材定位字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:17:30.000Z',
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
      { chapter_no: 3, title: '白线反制' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：题材定位缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('genre_positioning_checks.题材承诺漂移')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('genre_tag=规则怪谈 + 超人爽文')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('core_hook=超人能力不是横推')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('type_formula=规则压迫 -> 发现漏洞')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('genre_strength=强规则、强反制、强章尾门槛')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('book_title_blurb_alignment=标题和简介都承诺超人规则反制')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('题材长板')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('genre_tag')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('type_formula')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('genre_strength')
    expect(prompt).toContain('genre_positioning_checks.题材承诺漂移')
    expect(prompt).toContain('不能再把题材承诺漂成普通校园悬疑')
  })

  test('carries unresolved female audience checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '她自己开门' },
      [
        { id: 2, chapter_no: 2, title: '雨夜旧宅' },
        { id: 3, chapter_no: 3, title: '她自己开门' },
      ],
      [
        {
          id: 210,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:18:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                female_audience_checks: [
                  {
                    key: 'female_agency_missing',
                    label: '女主主动性',
                    status: 'fail',
                    evidence: '雨夜旧宅里所有关键决定都由男主替女主做，女主只被安排着赢。',
                    fix: '下一章必须让女主自己做决定、自己推进开门行动，并由她承担选择代价。',
                  },
                  {
                    key: 'abuse_dosage_no_sugar',
                    label: '虐戏剂量',
                    status: 'warn',
                    evidence: '连续两场压迫后没有给安全感、反转或糖，情绪只向下压。',
                    fix: '下一章必须在压迫后补一个安全感锚点，并给出反转或糖，避免连续整卷只虐。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '她在雨夜改写命运', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '她自己开门',
        summary: '女主主动推开旧宅内门，拿回决定权。',
        conflict: '男主想替她挡下风险，女主必须自己选择是否进入。',
        ending_hook: '门后传出母亲留下的第二句录音。',
        scene_cards: [
          { scene_no: 1, title: '自己开门', reader_payoff: '女主主动做决定并获得安全感锚点。' },
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
      { chapter_no: 3, title: '她自己开门' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修女频长篇')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('女频长篇：女频缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('女主自己做决定')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('安全感锚点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('反转或糖')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('女频长篇：女频缺口 2')
    expect(prompt).toContain('避免连续整卷只虐')
  })

  test('carries female audience execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '她自己开门' },
      [
        { id: 2, chapter_no: 2, title: '雨夜旧宅' },
        { id: 3, chapter_no: 3, title: '她自己开门' },
      ],
      [
        {
          id: 220,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:18:30.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                female_audience_checks: [
                  {
                    key: 'agency_and_security_missing',
                    label: '主动性和安全感缺口',
                    status: 'fail',
                    security_anchor: '女主推门前必须获得自己确认的安全锚点：母亲录音里的旧称呼。',
                    reader_identification: '让读者代入她终于不再被安排，而是自己选择进门。',
                    heroine_agency: '关键动作由女主完成：她拒绝男主代替，自己按下门锁。',
                    relationship_axis: '男主从替她挡风险，转为尊重她的决定并守在门外。',
                    post_abuse_payoff: '压迫后给一个反转或糖：门后录音证明母亲一直给她留路。',
                    evidence: '前章所有关键决定都由男主替她做，压迫后没有安全感锚点。',
                    fix: '下一章必须让女主自己做决定、自己推门，并用安全感锚点和反转回报承接压迫。',
                    remaining_risk: '不能再让女主只被保护、被安排着赢。',
                  },
                  {
                    key: 'relationship_axis_ok',
                    label: '关系轴',
                    status: 'pass',
                    security_anchor: '已兑现。',
                    reader_identification: '已兑现。',
                    heroine_agency: '已兑现。',
                    relationship_axis: '已兑现。',
                    post_abuse_payoff: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '她在雨夜改写命运', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '她自己开门',
        summary: '女主主动推开旧宅内门，拿回决定权。',
        conflict: '男主想替她挡下风险，女主必须自己选择是否进入。',
        ending_hook: '门后传出母亲留下的第二句录音。',
        scene_cards: [
          { scene_no: 1, title: '自己开门', reader_payoff: '女频长篇字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:18:30.000Z',
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
      { chapter_no: 3, title: '她自己开门' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修女频长篇')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('女频长篇：女频缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('female_audience_checks.主动性和安全感缺口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('security_anchor=女主推门前必须获得自己确认的安全锚点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_identification=让读者代入她终于不再被安排')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('heroine_agency=关键动作由女主完成')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('relationship_axis=男主从替她挡风险')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('post_abuse_payoff=压迫后给一个反转或糖')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('关系轴')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('security_anchor')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('heroine_agency')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('post_abuse_payoff')
    expect(prompt).toContain('female_audience_checks.主动性和安全感缺口')
    expect(prompt).toContain('不能再让女主只被保护、被安排着赢')
  })

  test('carries upgrade rhythm execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '半格权限' },
      [
        { id: 3, chapter_no: 3, title: '门卡代价' },
        { id: 4, chapter_no: 4, title: '半格权限' },
      ],
      [
        {
          id: 221,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:19:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                upgrade_rhythm_checks: [
                  {
                    key: 'upgrade_feedback_missing',
                    label: '升级反馈不足',
                    status: 'fail',
                    before_after_contrast: '升级前门卡只能开外门，升级后能短暂点亮内库半格权限。',
                    instant_feedback: '主角按下门卡时，门缝白线退后半寸。',
                    delayed_feedback: '半格权限只能维持三息，三息后反噬主角旧伤。',
                    new_threshold: '下一门槛是必须找到黑塔许可编号。',
                    cheat_rule: '门卡升级必须以半印血线为代价，不能无成本横推。',
                    evidence: '本章写主角拿到权限，但没有前后对比、即时反馈和新门槛。',
                    fix: '下一章必须补升级前后对比、即时反馈、延迟代价和下一门槛。',
                    remaining_risk: '不能再让升级只停在系统提示。',
                  },
                  {
                    key: 'threshold_ok',
                    label: '新门槛',
                    status: 'pass',
                    before_after_contrast: '已兑现。',
                    instant_feedback: '已兑现。',
                    delayed_feedback: '已兑现。',
                    new_threshold: '已兑现。',
                    cheat_rule: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
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
        chapter_no: 4,
        title: '半格权限',
        summary: '主角用半印血线换来半格门卡权限。',
        conflict: '权限只能维持三息，广播规则逼他继续付代价。',
        ending_hook: '门卡上浮出黑塔许可编号。',
        scene_cards: [
          { scene_no: 1, title: '半格权限', reader_payoff: '升级节奏字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:19:00.000Z',
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
      { chapter_no: 4, title: '半格权限' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修升级节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('升级节奏：升级缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('upgrade_rhythm_checks.升级反馈不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('before_after_contrast=升级前门卡只能开外门')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('instant_feedback=主角按下门卡时')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('delayed_feedback=半格权限只能维持三息')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_threshold=下一门槛是必须找到黑塔许可编号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cheat_rule=门卡升级必须以半印血线为代价')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('新门槛')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('before_after_contrast')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('instant_feedback')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_threshold')
    expect(prompt).toContain('upgrade_rhythm_checks.升级反馈不足')
    expect(prompt).toContain('不能再让升级只停在系统提示')
  })

  test('carries conflict structure execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '封门票据' },
      [
        { id: 3, chapter_no: 3, title: '旧仓口供' },
        { id: 4, chapter_no: 4, title: '封门票据' },
      ],
      [
        {
          id: 222,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                conflict_structure_checks: [
                  {
                    key: 'blocker_and_result_missing',
                    label: '冲突缺口 1',
                    status: 'fail',
                    blocker: '仓库管事锁住唯一出口，并拿账册逼主角认下假债。',
                    no_exit_condition: '主角若离开旧仓，妹妹的赎身票据会被当场烧掉。',
                    stakes_or_exit_cost: '退出代价是妹妹身份被卖、主角失去翻案证据。',
                    action_block: '管事派人抢走半张票据，逼主角当场夺回并公开账册页码。',
                    win_loss_result: '主角夺回票据但暴露自己藏着账册副页，换来下一轮追捕。',
                    evidence: '上一章只有口头争执，没有真正阻止主角得到目标，也没有明确胜负。',
                    fix: '下一章必须让阻止者实际封门，设置有进无出的退出代价，并用行动阻拦打出胜负变化。',
                    remaining_risk: '不能再让冲突停在嘴炮和可随时离场。',
                  },
                  {
                    key: 'stakes_ok',
                    label: '结构闭环已完成',
                    status: 'pass',
                    blocker: '已兑现。',
                    no_exit_condition: '已兑现。',
                    stakes_or_exit_cost: '已兑现。',
                    action_block: '已兑现。',
                    win_loss_result: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '封门票据',
        summary: '主角被锁进旧仓，只能夺回票据并公开账册页码。',
        conflict: '管事封门抢票据，主角必须在无法退出的局面里夺回证据。',
        ending_hook: '账册副页暴露后，巡捕开始追他。',
        scene_cards: [
          { scene_no: 1, title: '封门抢票', reader_payoff: '冲突结构字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:20:00.000Z',
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
      { chapter_no: 4, title: '封门票据' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修冲突结构')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('冲突结构：冲突缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('conflict_structure_checks.冲突缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('blocker=仓库管事锁住唯一出口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('no_exit_condition=主角若离开旧仓')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('stakes_or_exit_cost=退出代价是妹妹身份被卖')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action_block=管事派人抢走半张票据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('win_loss_result=主角夺回票据但暴露自己藏着账册副页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('结构闭环已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('blocker')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('action_block')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('win_loss_result')
    expect(prompt).toContain('conflict_structure_checks.冲突缺口 1')
    expect(prompt).toContain('不能再让冲突停在嘴炮和可随时离场')
  })

  test('carries story loop execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '缺页换门' },
      [
        { id: 4, chapter_no: 4, title: '封门票据' },
        { id: 5, chapter_no: 5, title: '缺页换门' },
      ],
      [
        {
          id: 223,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:21:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                story_loop_checks: [
                  {
                    key: 'loop_payoff_missing',
                    label: '循环闭环不足',
                    status: 'warn',
                    setup_question: '账册缺页到底能换到哪扇门的通行权。',
                    obstacle: '巡捕和管事都想抢先拿到缺页，阻断主角验证。',
                    choice: '主角必须选择先救妹妹，还是先用缺页换门。',
                    cost: '选择换门会让妹妹短暂落入管事手里。',
                    payoff_or_answer_fragment: '缺页只能换到后巷侧门，不是库房正门。',
                    new_question: '侧门后为什么贴着妹妹的旧名牌。',
                    evidence: '上一章提出缺页和门，却没有形成提问、阻碍、选择、代价、部分答案和新问题的循环。',
                    fix: '下一章必须按提问->阻碍->选择->代价->部分答案->新问题闭合一轮循环。',
                    remaining_risk: '不能再只抛新设定而不回收本章循环。',
                  },
                  {
                    key: 'loop_setup_ok',
                    label: '循环设问已完成',
                    status: 'pass',
                    setup_question: '已兑现。',
                    obstacle: '已兑现。',
                    choice: '已兑现。',
                    cost: '已兑现。',
                    payoff_or_answer_fragment: '已兑现。',
                    new_question: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 5,
        title: '缺页换门',
        summary: '主角用账册缺页换到后巷侧门通行权。',
        conflict: '巡捕和管事同时追索缺页，主角必须在救妹妹和换门之间做选择。',
        ending_hook: '侧门后贴着妹妹的旧名牌。',
        scene_cards: [
          { scene_no: 1, title: '缺页换门', reader_payoff: '故事循环字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:21:00.000Z',
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
      { chapter_no: 5, title: '缺页换门' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修故事循环')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('故事循环：循环缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('story_loop_checks.循环闭环不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('setup_question=账册缺页到底能换到哪扇门的通行权')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('obstacle=巡捕和管事都想抢先拿到缺页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('choice=主角必须选择先救妹妹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost=选择换门会让妹妹短暂落入管事手里')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('payoff_or_answer_fragment=缺页只能换到后巷侧门')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_question=侧门后为什么贴着妹妹的旧名牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('循环设问已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('setup_question')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_question')
    expect(prompt).toContain('story_loop_checks.循环闭环不足')
    expect(prompt).toContain('不能再只抛新设定而不回收本章循环')
  })

  test('carries emotional arc execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 6, chapter_no: 6, title: '旧名牌回声' },
      [
        { id: 5, chapter_no: 5, title: '缺页换门' },
        { id: 6, chapter_no: 6, title: '旧名牌回声' },
      ],
      [
        {
          id: 224,
          chapter_id: 5,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:22:00.000Z',
          payload: JSON.stringify({
            chapter_id: 5,
            chapter_no: 5,
            self_check: {
              review: {
                emotional_arc_checks: [
                  {
                    key: 'release_without_payoff',
                    label: '释放回报不足',
                    status: 'fail',
                    calm_or_pressure: '开篇用旧名牌和锁门声制造低压安静感。',
                    mobilization: '妹妹旧名被喊出后，主角必须被调动到主动护人。',
                    counteraction: '主角用账册副页反制管事，把羞辱转成公开质询。',
                    release: '管事被迫承认旧名牌对应的赎身记录。',
                    reader_payoff: '读者获得妹妹身份被看见、主角终于护住她的安全感回报。',
                    evidence: '上一章只揭露旧名牌，没有从低压调动到反制释放，也缺读者回报。',
                    fix: '下一章必须按低压->调动->反制->释放->读者回报写完整情绪弧。',
                    remaining_risk: '不能再只揭信息而不给情绪释放和安全感。',
                  },
                  {
                    key: 'mobilization_ok',
                    label: '情绪调动已完成',
                    status: 'pass',
                    calm_or_pressure: '已兑现。',
                    mobilization: '已兑现。',
                    counteraction: '已兑现。',
                    release: '已兑现。',
                    reader_payoff: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 6,
        title: '旧名牌回声',
        summary: '主角用账册副页逼管事承认妹妹旧名牌的赎身记录。',
        conflict: '管事想用旧名羞辱妹妹，主角必须把羞辱反打成公开证据。',
        ending_hook: '赎身记录背面出现第二个旧名。',
        scene_cards: [
          { scene_no: 1, title: '旧名牌回声', reader_payoff: '情绪弧字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:22:00.000Z',
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
      { chapter_no: 6, title: '旧名牌回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修情绪弧')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('情绪弧：情绪缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotional_arc_checks.释放回报不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('calm_or_pressure=开篇用旧名牌和锁门声制造低压安静感')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('mobilization=妹妹旧名被喊出后')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('counteraction=主角用账册副页反制管事')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('release=管事被迫承认旧名牌对应的赎身记录')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_payoff=读者获得妹妹身份被看见')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('情绪调动已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('calm_or_pressure')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('counteraction')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('reader_payoff')
    expect(prompt).toContain('emotional_arc_checks.释放回报不足')
    expect(prompt).toContain('不能再只揭信息而不给情绪释放和安全感')
  })

  test('carries dialogue execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '副页对质' },
      [
        { id: 6, chapter_no: 6, title: '旧名牌回声' },
        { id: 7, chapter_no: 7, title: '副页对质' },
      ],
      [
        {
          id: 225,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:23:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                dialogue_checks: [
                  {
                    key: 'flat_dialogue_no_shift',
                    label: '对白缺少潜台词和权力变化',
                    status: 'warn',
                    speaker: '主角和管事',
                    agenda: '主角要逼管事承认副页来源，管事要把副页说成伪造。',
                    subtext: '主角表面问票据编号，实际试探管事是否知道妹妹旧名。',
                    power_shift: '对话前管事压主角，对话后主角用编号让管事失声。',
                    information_delta: '读者获得副页编号对应赎身记录的新增信息。',
                    character_voice: '主角短句冷问，管事拖长句绕开关键编号。',
                    evidence: '上一章对白只是互相说明立场，没有潜台词、权力转移和信息增量。',
                    fix: '下一章必须让对白承载诉求、潜台词、权力变化和信息增量，并拉开主角与管事声线。',
                    remaining_risk: '不能再写成两个人轮流解释剧情。',
                  },
                  {
                    key: 'voice_ok',
                    label: '声线区分已完成',
                    status: 'pass',
                    speaker: '已兑现。',
                    agenda: '已兑现。',
                    subtext: '已兑现。',
                    power_shift: '已兑现。',
                    information_delta: '已兑现。',
                    character_voice: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '副页对质',
        summary: '主角在众人面前用账册副页逼管事承认赎身记录。',
        conflict: '管事把副页说成伪造，主角必须用编号和旧名逼他露怯。',
        ending_hook: '管事失声后，副页背面浮出第二个编号。',
        scene_cards: [
          { scene_no: 1, title: '副页对质', reader_payoff: '对白字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:23:00.000Z',
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
      { chapter_no: 7, title: '副页对质' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修对白')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修对白：对白缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('dialogue_checks.对白缺少潜台词和权力变化')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('speaker=主角和管事')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('agenda=主角要逼管事承认副页来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('subtext=主角表面问票据编号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('power_shift=对话前管事压主角')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('information_delta=读者获得副页编号对应赎身记录')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_voice=主角短句冷问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('声线区分已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('speaker')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('power_shift')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('information_delta')
    expect(prompt).toContain('dialogue_checks.对白缺少潜台词和权力变化')
    expect(prompt).toContain('不能再写成两个人轮流解释剧情')
  })

  test('carries plot dynamics execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '第二编号' },
      [
        { id: 7, chapter_no: 7, title: '副页对质' },
        { id: 8, chapter_no: 8, title: '第二编号' },
      ],
      [
        {
          id: 226,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                plot_dynamics_checks: [
                  {
                    key: 'no_action_feedback',
                    label: '行动反馈不足',
                    status: 'fail',
                    goal: '主角要用第二编号找到真正赎身记录。',
                    obstacle: '巡捕把副页扣为伪证，管事派人封住账房。',
                    action: '主角必须先偷回副页，再用编号换到账房钥匙。',
                    cost_or_feedback: '偷回副页会暴露妹妹藏身处，换来追捕升级。',
                    new_expectation: '第二编号指向账房暗格里的另一份契约。',
                    evidence: '上一章有新编号，但没有目标、阻碍、行动、代价和下一期待的连续推进。',
                    fix: '下一章必须让目标遇到阻碍，由主角行动破局，并付出代价后打开新期待。',
                    remaining_risk: '不能再让剧情只靠发现新线索原地转圈。',
                  },
                  {
                    key: 'goal_ok',
                    label: '动力闭环已完成',
                    status: 'pass',
                    goal: '已兑现。',
                    obstacle: '已兑现。',
                    action: '已兑现。',
                    cost_or_feedback: '已兑现。',
                    new_expectation: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '第二编号',
        summary: '主角偷回副页，用第二编号换到账房钥匙。',
        conflict: '巡捕扣住副页，管事封住账房，主角必须付出藏身处暴露的代价。',
        ending_hook: '账房暗格里出现另一份契约。',
        scene_cards: [
          { scene_no: 1, title: '第二编号', reader_payoff: '剧情动力字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:24:00.000Z',
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
      { chapter_no: 8, title: '第二编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修剧情动力')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修剧情动力：动力缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('plot_dynamics_checks.行动反馈不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('goal=主角要用第二编号找到真正赎身记录')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('obstacle=巡捕把副页扣为伪证')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action=主角必须先偷回副页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost_or_feedback=偷回副页会暴露妹妹藏身处')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_expectation=第二编号指向账房暗格')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('动力闭环已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('goal')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('action')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_expectation')
    expect(prompt).toContain('plot_dynamics_checks.行动反馈不足')
    expect(prompt).toContain('不能再让剧情只靠发现新线索原地转圈')
  })

  test('carries continuity heat execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '内库编号' },
      [
        { id: 8, chapter_no: 8, title: '第二编号' },
        { id: 9, chapter_no: 9, title: '内库编号' },
      ],
      [
        {
          id: 230,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:30.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                continuity_heat_checks: [
                  {
                    key: 'thread_heat_missing',
                    label: '热度追踪断层',
                    status: 'warn',
                    heat_state: 'hot=沈峤旧案必须推进；warm=妹妹赎身线保温；cold=巡捕内库编号预热；archived=管事旧仓线休眠。',
                    hot_progress: '让沈峤旧案从旧印推进到父亲案卷缺页。',
                    warm_keepalive: '用妹妹旧名牌回声提醒赎身线仍是主角情感目标。',
                    cold_warmup: '巡捕内库编号先以契约缺角编号出现，不直接回收。',
                    archived_boundary: '管事旧仓线暂休眠，只用追捕后果保留边界，不误激活新旧仓冲突。',
                    evidence: '上一章只提契约和编号，没有推进 hot 线，也没有保温妹妹线或预热内库线。',
                    fix: '下一章必须推进沈峤旧案，保温妹妹赎身线，预热内库编号，并说明管事旧仓线暂休眠。',
                    remaining_risk: '不能再让长线只靠名字露面而没有热度变化。',
                  },
                  {
                    key: 'heat_ok',
                    label: '热度追踪已完成',
                    status: 'pass',
                    heat_state: '已兑现。',
                    hot_progress: '已兑现。',
                    warm_keepalive: '已兑现。',
                    cold_warmup: '已兑现。',
                    archived_boundary: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '内库编号',
        summary: '主角顺着契约缺角编号发现巡捕内库与沈峤旧案有关。',
        conflict: '沈峤想压住旧案，主角必须用契约缺角逼他承认内库编号。',
        ending_hook: '内库编号对应的案卷缺了一页。',
        scene_cards: [
          { scene_no: 1, title: '编号缺角', reader_payoff: '连续性热度字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:24:30.000Z',
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
      { chapter_no: 9, title: '内库编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修连续性热度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('连续性热度：热度缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('continuity_heat_checks.热度追踪断层')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('heat_state=hot=沈峤旧案必须推进')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('hot_progress=让沈峤旧案从旧印推进到父亲案卷缺页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('warm_keepalive=用妹妹旧名牌回声提醒赎身线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cold_warmup=巡捕内库编号先以契约缺角编号出现')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('archived_boundary=管事旧仓线暂休眠')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('热度追踪已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('hot_progress')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('warm_keepalive')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('archived_boundary')
    expect(prompt).toContain('continuity_heat_checks.热度追踪断层')
    expect(prompt).toContain('不能再让长线只靠名字露面而没有热度变化')
  })

  test('carries character relation execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '暗格同盟' },
      [
        { id: 8, chapter_no: 8, title: '第二编号' },
        { id: 9, chapter_no: 9, title: '暗格同盟' },
      ],
      [
        {
          id: 227,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                character_relation_checks: [
                  {
                    key: 'helper_without_protagonist_goal',
                    label: '主角目标归属不足',
                    status: 'fail',
                    relation_type: '交易同盟转信任同盟。',
                    protagonist_goal: '主角要拿到账房暗格里的契约，证明妹妹赎身记录被篡改。',
                    agency_choice: '主角必须主动选择把半张副页交给账房少女，让她验证编号。',
                    cost: '交出副页会让主角短暂失去唯一证据，并承担被背叛风险。',
                    relation_shift: '账房少女从只求自保，转为愿意替主角打开暗格。',
                    evidence: '上一章账房少女只负责提供帮助，主角像是在替她完成目标，缺少自己的选择和代价。',
                    fix: '下一章必须把目标归还给主角，让关系角色有自己的诉求，并通过主角主动选择和代价推动关系变化。',
                    remaining_risk: '不能再让关系角色只当工具人递线索。',
                  },
                  {
                    key: 'relation_arc_ok',
                    label: '关系弧线已完成',
                    status: 'pass',
                    relation_type: '已兑现。',
                    protagonist_goal: '已兑现。',
                    agency_choice: '已兑现。',
                    cost: '已兑现。',
                    relation_shift: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '暗格同盟',
        summary: '主角用半张副页换到账房少女验证暗格契约。',
        conflict: '账房少女只想自保，主角必须冒着失去证据的风险换取她开暗格。',
        ending_hook: '暗格契约上的印章指向巡捕。',
        scene_cards: [
          { scene_no: 1, title: '半页换门', reader_payoff: '角色关系字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:25:00.000Z',
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
      { chapter_no: 9, title: '暗格同盟' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修角色关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('角色关系：关系缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_relation_checks.主角目标归属不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('relation_type=交易同盟转信任同盟')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('protagonist_goal=主角要拿到账房暗格里的契约')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('agency_choice=主角必须主动选择把半张副页交给账房少女')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost=交出副页会让主角短暂失去唯一证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('relation_shift=账房少女从只求自保')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('关系弧线已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('protagonist_goal')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('agency_choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('relation_shift')
    expect(prompt).toContain('character_relation_checks.主角目标归属不足')
    expect(prompt).toContain('不能再让关系角色只当工具人递线索')
  })

  test('carries character behavior execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 10, chapter_no: 10, title: '巡捕旧痛' },
      [
        { id: 9, chapter_no: 9, title: '暗格同盟' },
        { id: 10, chapter_no: 10, title: '巡捕旧痛' },
      ],
      [
        {
          id: 228,
          chapter_id: 9,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 9,
            chapter_no: 9,
            self_check: {
              review: {
                character_behavior_checks: [
                  {
                    key: 'motive_chain_too_generic',
                    label: '动机链空泛',
                    status: 'warn',
                    character: '巡捕沈峤',
                    concrete_motive: '沈峤扣下契约不是单纯贪权，而是契约牵出他父亲当年被诬陷的旧案。',
                    emotional_reason: '他害怕旧案重开后父亲最后一点清名也被毁。',
                    trigger_change: '主角拿出暗格契约上的旧印，触发沈峤从压案转为试探合作。',
                    visible_choice: '沈峤必须亲手放走主角三十息，换取主角带回第二份契约。',
                    cost: '他放人会被同僚记名，失去巡捕内部的信任。',
                    evidence: '上一章沈峤只作为追捕压力出现，缺具体动机、情感理由和可见选择。',
                    fix: '下一章必须补沈峤的具体旧案动机、情感理由、触发变化、可见选择和代价。',
                    remaining_risk: '不能再让反派/阻力角色只是工具化追捕。',
                  },
                  {
                    key: 'visible_choice_ok',
                    label: '行为选择已完成',
                    status: 'pass',
                    character: '已兑现。',
                    concrete_motive: '已兑现。',
                    emotional_reason: '已兑现。',
                    trigger_change: '已兑现。',
                    visible_choice: '已兑现。',
                    cost: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 10,
        title: '巡捕旧痛',
        summary: '主角用旧印触发沈峤的旧案动机，让他短暂放行。',
        conflict: '沈峤扣住契约压案，主角必须让他看见旧案和父亲清名的关联。',
        ending_hook: '沈峤放人后，巡捕名册上划掉了他的名字。',
        scene_cards: [
          { scene_no: 1, title: '旧印试探', reader_payoff: '角色行为字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:26:00.000Z',
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
      { chapter_no: 10, title: '巡捕旧痛' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修角色行为')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('角色行为：人设缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_behavior_checks.动机链空泛')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character=巡捕沈峤')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('concrete_motive=沈峤扣下契约不是单纯贪权')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotional_reason=他害怕旧案重开后')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trigger_change=主角拿出暗格契约上的旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('visible_choice=沈峤必须亲手放走主角三十息')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost=他放人会被同僚记名')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('行为选择已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('concrete_motive')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('visible_choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('cost')
    expect(prompt).toContain('character_behavior_checks.动机链空泛')
    expect(prompt).toContain('不能再让反派/阻力角色只是工具化追捕')
  })

  test('carries asset linkage execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 11, chapter_no: 11, title: '暗格契约' },
      [
        { id: 10, chapter_no: 10, title: '巡捕旧痛' },
        { id: 11, chapter_no: 11, title: '暗格契约' },
      ],
      [
        {
          id: 229,
          chapter_id: 10,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:27:00.000Z',
          payload: JSON.stringify({
            chapter_id: 10,
            chapter_no: 10,
            self_check: {
              review: {
                asset_linkage_checks: [
                  {
                    key: 'contract_isolated',
                    label: '暗格契约孤立',
                    status: 'fail',
                    asset_name: '账房暗格契约',
                    function: '证明沈峤父亲旧案与妹妹赎身记录被篡改有关。',
                    ownership: '主角暂持半张副页，账房少女掌握暗格开法。',
                    trigger_condition: '只有沈峤看到旧印并放行三十息，主角才能打开暗格。',
                    limitation: '契约缺右下角验印，不能直接定罪，只能换来下一份证据。',
                    consequence: '使用契约会暴露账房少女协助主角，让她被管事盯上。',
                    story_link: '把妹妹赎身线、沈峤旧案和巡捕内鬼线挂在同一份证据上。',
                    evidence: '上一章只点名暗格契约，没有写功能、归属、触发条件、限制和后果。',
                    fix: '下一章必须让暗格契约承担证明功能，明确归属与触发条件，并用限制和后果连接下一条线。',
                    remaining_risk: '不能再让关键资产只作为设定名词出现。',
                  },
                  {
                    key: 'asset_function_ok',
                    label: '资产功能已完成',
                    status: 'pass',
                    asset_name: '已兑现。',
                    function: '已兑现。',
                    ownership: '已兑现。',
                    trigger_condition: '已兑现。',
                    limitation: '已兑现。',
                    consequence: '已兑现。',
                    story_link: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 11,
        title: '暗格契约',
        summary: '主角打开账房暗格，拿到能串起赎身记录和旧案的契约。',
        conflict: '契约缺验印，主角必须决定是否暴露账房少女来换下一份证据。',
        ending_hook: '契约缺角处留下巡捕内库的编号。',
        scene_cards: [
          { scene_no: 1, title: '契约缺角', reader_payoff: '资产挂钩字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:27:00.000Z',
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
      { chapter_no: 11, title: '暗格契约' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修资产挂钩')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('资产挂钩：孤立资产 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('asset_linkage_checks.暗格契约孤立')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('asset_name=账房暗格契约')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('function=证明沈峤父亲旧案')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('ownership=主角暂持半张副页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trigger_condition=只有沈峤看到旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('limitation=契约缺右下角验印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('consequence=使用契约会暴露账房少女')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('story_link=把妹妹赎身线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('资产功能已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('asset_name')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('trigger_condition')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('story_link')
    expect(prompt).toContain('asset_linkage_checks.暗格契约孤立')
    expect(prompt).toContain('不能再让关键资产只作为设定名词出现')
  })

  test('carries state tracking execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 12, chapter_no: 12, title: '旧伤边界' },
      [
        { id: 11, chapter_no: 11, title: '暗格契约' },
        { id: 12, chapter_no: 12, title: '旧伤边界' },
      ],
      [
        {
          id: 231,
          chapter_id: 11,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:28:00.000Z',
          payload: JSON.stringify({
            chapter_id: 11,
            chapter_no: 11,
            self_check: {
              review: {
                state_tracking_checks: [
                  {
                    key: 'stale_injury_state',
                    label: '旧伤状态误用',
                    status: 'fail',
                    state_subject: '主角左肩旧伤',
                    state_type: '角色身体状态',
                    previous_state: '上一章旧伤只是被沈峤按住后发麻，没有真正复发。',
                    allowed_state: '本章只能写发麻、动作受限和短暂疼痛，不能写成重伤复发。',
                    used_in_chapter: '用左肩发麻影响开锁动作，但不让主角因此倒地。',
                    excluded_reason: '排除“旧伤复发到吐血”，因为前文没有触发重伤条件。',
                    evidence: '上一章把左肩旧伤写成突然复发，导致状态漂移。',
                    fix: '下一章必须按允许状态使用左肩旧伤，并明确排除重伤复发写法。',
                    remaining_risk: '不能再把未触发的旧状态当成当前事实使用。',
                  },
                  {
                    key: 'state_ok',
                    label: '状态边界已完成',
                    status: 'pass',
                    state_subject: '已兑现。',
                    state_type: '已兑现。',
                    previous_state: '已兑现。',
                    allowed_state: '已兑现。',
                    used_in_chapter: '已兑现。',
                    evidence: '已兑现。',
                    excluded_reason: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 12,
        title: '旧伤边界',
        summary: '主角带着左肩发麻打开内库，但不能把旧伤写成无因复发。',
        conflict: '左肩发麻影响开锁速度，巡捕追近，主角必须在状态边界内完成动作。',
        ending_hook: '内库门开后，主角发现验印台被搬空。',
        scene_cards: [
          { scene_no: 1, title: '发麻开锁', reader_payoff: '状态筛选字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:28:00.000Z',
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
      { chapter_no: 12, title: '旧伤边界' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修状态筛选')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('状态筛选：上下文缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_tracking_checks.旧伤状态误用')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_subject=主角左肩旧伤')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_type=角色身体状态')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('previous_state=上一章旧伤只是被沈峤按住后发麻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('allowed_state=本章只能写发麻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('used_in_chapter=用左肩发麻影响开锁动作')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('excluded_reason=排除“旧伤复发到吐血”')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('状态边界已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('previous_state')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('used_in_chapter')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('excluded_reason')
    expect(prompt).toContain('state_tracking_checks.旧伤状态误用')
    expect(prompt).toContain('不能再把未触发的旧状态当成当前事实使用')
  })

  test('carries suspense execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '名册缺页' },
      [
        { id: 2, chapter_no: 2, title: '账页背面' },
        { id: 3, chapter_no: 3, title: '名册缺页' },
      ],
      [
        {
          id: 213,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:23:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                suspense_checks: [
                  {
                    key: 'answer_path_missing',
                    label: '答案路径断裂',
                    status: 'fail',
                    question: '账页背面的编号到底指向谁',
                    misdirect: '执事故意把编号解释成库房货号',
                    partial_answer: '编号其实是证人名册页码',
                    new_expectation: '名册缺掉的一页指向第三个证人',
                    evidence: '本章只抛出编号，没有可信提示、部分答案和新的期待接力。',
                    fix: '下一章必须先让编号触发可信误导，中段给出名册页码的部分答案，章尾挂出第三个证人。',
                    remaining_risk: '不能再只制造谜面而不给答案路径。',
                  },
                  {
                    key: 'misdirect_landed',
                    label: '误导可信',
                    status: 'pass',
                    question: '已兑现。',
                    misdirect: '已兑现。',
                    partial_answer: '已兑现。',
                    new_expectation: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '名册缺页',
        summary: '主角顺着账页背面的编号找到被撕掉的证人名册。',
        conflict: '执事试图把编号解释成普通货号，拖断答案路径。',
        ending_hook: '缺页边缘露出第三个证人的姓氏。',
        scene_cards: [
          { scene_no: 1, title: '编号误导', reader_payoff: '悬念编排字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:23:00.000Z',
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
      { chapter_no: 3, title: '名册缺页' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修悬念编排')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('悬念编排：悬念缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('suspense_checks.答案路径断裂')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('question=账页背面的编号到底指向谁')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('misdirect=执事故意把编号解释成库房货号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('partial_answer=编号其实是证人名册页码')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_expectation=名册缺掉的一页指向第三个证人')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('误导可信')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('question')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('partial_answer')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_expectation')
    expect(prompt).toContain('suspense_checks.答案路径断裂')
    expect(prompt).toContain('不能再只制造谜面而不给答案路径')
  })

  test('carries reversal execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '证词反咬' },
      [
        { id: 2, chapter_no: 2, title: '旧账作证' },
        { id: 3, chapter_no: 3, title: '证词反咬' },
      ],
      [
        {
          id: 214,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                reversal_checks: [
                  {
                    key: 'fair_clue_missing',
                    label: '公平暗示不足',
                    status: 'warn',
                    reversal_type: '身份反转 + 信息反转',
                    fair_clues: '账页墨迹、证人称呼、执事避开的旧印三处暗示必须提前入场。',
                    misdirect: '让读者先以为旧印只证明账册调包。',
                    reveal_timing: '70-85% 段落揭示证人其实是旧案当事人。',
                    impact_after_reveal: '揭示后必须改变主角处境，让执事的指控反咬自己。',
                    evidence: '本章反转只靠章末一句新证人身份，前文缺公平暗示。',
                    fix: '下一章必须先补三处公平暗示，再用可信误导遮住身份反转，揭示后立刻改变局势。',
                    remaining_risk: '不能再用天降身份解释反转。',
                  },
                  {
                    key: 'timing_ok',
                    label: '揭示时机',
                    status: 'pass',
                    reversal_type: '已兑现。',
                    fair_clues: '已兑现。',
                    misdirect: '已兑现。',
                    reveal_timing: '已兑现。',
                    impact_after_reveal: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '证词反咬',
        summary: '旧案证人的身份反转让执事的指控反咬自己。',
        conflict: '执事把旧印解释成伪证，主角必须让暗示链在揭示前成立。',
        ending_hook: '证人喊出执事二十年前的旧名。',
        scene_cards: [
          { scene_no: 1, title: '旧印暗示', reader_payoff: '反转设计字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:24:00.000Z',
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
      { chapter_no: 3, title: '证词反咬' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修反转设计')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('反转设计：反转缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reversal_checks.公平暗示不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reversal_type=身份反转 + 信息反转')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('fair_clues=账页墨迹、证人称呼、执事避开的旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('misdirect=让读者先以为旧印只证明账册调包')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reveal_timing=70-85%')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('impact_after_reveal=揭示后必须改变主角处境')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('揭示时机')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('fair_clues')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('reveal_timing')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('impact_after_reveal')
    expect(prompt).toContain('reversal_checks.公平暗示不足')
    expect(prompt).toContain('不能再用天降身份解释反转')
  })

  test('carries unresolved showdown checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '三方震动' },
      [
        { id: 2, chapter_no: 2, title: '旧台压阵' },
        { id: 3, chapter_no: 3, title: '三方震动' },
      ],
      [
        {
          id: 211,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                showdown_checks: [
                  {
                    key: 'trump_card_management_broken',
                    label: '底牌管理',
                    status: 'fail',
                    evidence: '旧台对抗里一次性摊空三张底牌，反派没有被对应压制，也没有补新后手。',
                    fix: '下一章必须只出一个底牌，保留两到三个未揭示底牌，出牌后补新技能、新后手、新目标或更高门槛。',
                  },
                  {
                    key: 'three_pressure_three_shock_missing',
                    label: '三压一爆三震',
                    status: 'warn',
                    evidence: '主角爆发后只写全场震惊，缺友方、敌方、中立方的不同震动和利益变化。',
                    fix: '下一章必须补友方、敌方、中立方三路压力，主角一爆碾压后分别写三方不同震动。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧台登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '三方震动',
        summary: '主角在旧台上用一张底牌压住三方质疑。',
        conflict: '友方怀疑、敌方逼战、中立方观望同时压上来。',
        ending_hook: '旧台背后的更高门槛亮起。',
        scene_cards: [
          { scene_no: 1, title: '三方压阵', reader_payoff: '主角只出一张底牌并造成三方不同震动。' },
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
      { chapter_no: 3, title: '三方震动' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修高潮对抗')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('高潮对抗：爽点缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('只出一个底牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('两到三个未揭示底牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('三方不同震动')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('高潮对抗：爽点缺口 2')
    expect(prompt).toContain('更高门槛')
  })

  test('carries showdown execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '一印压阵' },
      [
        { id: 3, chapter_no: 3, title: '三方逼战' },
        { id: 4, chapter_no: 4, title: '一印压阵' },
      ],
      [
        {
          id: 215,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                showdown_checks: [
                  {
                    key: 'payoff_release_weak',
                    label: '爽点释放不足',
                    status: 'fail',
                    payoff_release: '主角亮出一枚旧印后必须立刻压住敌方质疑。',
                    trump_card_used: '只使用旧印一张底牌，保留名册缺页和第三证人。',
                    pressure_layers: '友方先怀疑、敌方逼战、中立方观望加码。',
                    audience_reactions: '友方松口气，敌方失声，中立方改口记录。',
                    consequence: '执事的罚令当场失效，主角拿到翻旧案资格。',
                    next_threshold: '更高门槛是内库封印需要第三证人亲自开启。',
                    evidence: '本章铺了三方压力，但主角出牌后没有压制反派，也没有新门槛。',
                    fix: '下一章必须让一张底牌释放爽点，三方分别震动，并在结果后补更高门槛。',
                    remaining_risk: '不能再让底牌亮出后只换来统一震惊。',
                  },
                  {
                    key: 'stage_ok',
                    label: '舞台层级',
                    status: 'pass',
                    payoff_release: '已兑现。',
                    trump_card_used: '已兑现。',
                    pressure_layers: '已兑现。',
                    audience_reactions: '已兑现。',
                    consequence: '已兑现。',
                    next_threshold: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧台登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '一印压阵',
        summary: '主角只用旧印这一张底牌压住旧台三方。',
        conflict: '敌方逼主角摊空底牌，友方和中立方都在看他的出牌后果。',
        ending_hook: '内库封印亮出第三证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '一印压阵', reader_payoff: '高潮对抗字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:25:00.000Z',
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
      { chapter_no: 4, title: '一印压阵' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修高潮对抗')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('高潮对抗：爽点缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('showdown_checks.爽点释放不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('payoff_release=主角亮出一枚旧印后必须立刻压住敌方质疑')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trump_card_used=只使用旧印一张底牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('pressure_layers=友方先怀疑、敌方逼战、中立方观望加码')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('audience_reactions=友方松口气，敌方失声，中立方改口记录')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('consequence=执事的罚令当场失效')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('next_threshold=更高门槛是内库封印需要第三证人亲自开启')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('舞台层级')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('pressure_layers')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('trump_card_used')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_threshold')
    expect(prompt).toContain('showdown_checks.爽点释放不足')
    expect(prompt).toContain('不能再让底牌亮出后只换来统一震惊')
  })

  test('carries unresolved bridge unit checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧巷新目标' },
      [
        { id: 2, chapter_no: 2, title: '桥段断档' },
        { id: 3, chapter_no: 3, title: '旧巷新目标' },
      ],
      [
        {
          id: 212,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:22:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                bridge_unit_checks: [
                  {
                    key: 'continuous_expectation_broken',
                    label: '连续期待',
                    status: 'fail',
                    evidence: '本章兑现旧期待后没有挂新期待，章尾没有新目标或连续小期待。',
                    fix: '下一章必须在兑现旧期待前挂新期待，并在章尾给出新目标或连续小期待。',
                  },
                  {
                    key: 'two_chapter_momentum_stall',
                    label: '连续两章无推进',
                    status: 'warn',
                    evidence: '连续两章只复盘旧线索，没有目标推进、状态变化或阶段衔接。',
                    fix: '下一章必须提高冲突密度，让目标推进、关系/伏笔/状态承接余波至少落地一项。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧巷登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '旧巷新目标',
        summary: '主角兑现旧线索前先挂出旧巷里的新目标。',
        conflict: '旧线索能解眼前危机，但新目标会暴露更高层追踪。',
        ending_hook: '旧巷尽头出现下一阶段的门牌。',
        scene_cards: [
          { scene_no: 1, title: '挂新期待', reader_payoff: '兑现旧期待前挂出新目标，并留下连续小期待。' },
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
      { chapter_no: 3, title: '旧巷新目标' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修桥段节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('桥段节奏：节奏缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('兑现旧期待前挂新期待')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('章尾给出新目标')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('关系/伏笔/状态承接余波')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('桥段节奏：节奏缺口 2')
    expect(prompt).toContain('连续小期待')
  })

  test('carries bridge unit execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '旧门新路' },
      [
        { id: 4, chapter_no: 4, title: '旧门余波' },
        { id: 5, chapter_no: 5, title: '旧门新路' },
      ],
      [
        {
          id: 216,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                bridge_unit_checks: [
                  {
                    key: 'stage_handoff_missing',
                    label: '阶段交接断档',
                    status: 'fail',
                    bridge_position: '四章桥段后的第1章，必须承接旧门余波并开启新阶段。',
                    old_expectation_payoff: '先兑现旧门封印为什么失效。',
                    new_expectation_seed: '再种下内库第三证人必须亲自开门的新期待。',
                    goal_progression: '主角目标从洗清旧账推进到进入内库找原始名册。',
                    climax_hook: '高潮中让内库门牌亮出半个证人姓氏。',
                    stage_handoff: '章尾交接到内库调查线，明确下一阶段行动地点和代价。',
                    evidence: '本章只处理旧门余波，没有给新目标、新期待和阶段交接。',
                    fix: '下一章必须先兑现旧门旧期待，再种新期待，并在章尾交接到内库调查线。',
                    remaining_risk: '不能再让过渡章只复盘旧信息。',
                  },
                  {
                    key: 'goal_progression_ok',
                    label: '目标推进',
                    status: 'pass',
                    bridge_position: '已兑现。',
                    old_expectation_payoff: '已兑现。',
                    new_expectation_seed: '已兑现。',
                    goal_progression: '已兑现。',
                    climax_hook: '已兑现。',
                    stage_handoff: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧巷登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 5,
        title: '旧门新路',
        summary: '主角兑现旧门余波，同时把目标推进到内库原始名册。',
        conflict: '旧期待必须收束，但新阶段的地点和代价也必须亮出来。',
        ending_hook: '内库门牌亮出半个证人姓氏。',
        scene_cards: [
          { scene_no: 1, title: '旧门新路', reader_payoff: '桥段节奏字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:26:00.000Z',
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
      { chapter_no: 5, title: '旧门新路' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修桥段节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('桥段节奏：节奏缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('bridge_unit_checks.阶段交接断档')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('bridge_position=四章桥段后的第1章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('old_expectation_payoff=先兑现旧门封印为什么失效')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_expectation_seed=再种下内库第三证人必须亲自开门的新期待')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('goal_progression=主角目标从洗清旧账推进到进入内库找原始名册')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('climax_hook=高潮中让内库门牌亮出半个证人姓氏')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('stage_handoff=章尾交接到内库调查线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('目标推进')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('old_expectation_payoff')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('goal_progression')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('stage_handoff')
    expect(prompt).toContain('bridge_unit_checks.阶段交接断档')
    expect(prompt).toContain('不能再让过渡章只复盘旧信息')
  })

  test('carries unresolved source readiness checks as source risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门牌来源' },
      [
        { id: 2, chapter_no: 2, title: '旧门牌' },
        { id: 3, chapter_no: 3, title: '门牌来源' },
      ],
      [
        {
          id: 213,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                source_readiness_checks: [
                  {
                    key: 'source_readiness_previous_chapter',
                    label: '上一章正文来源',
                    status: 'fail',
                    evidence: '上一章正文没有读到，但本章把旧楼门牌变化写成既定事实。',
                    fix: '下一章必须先补齐上一章正文来源，再把旧楼门牌变化写成当前行动依据。',
                  },
                  {
                    key: 'source_readiness_character_state',
                    label: '角色状态来源',
                    status: 'warn',
                    evidence: '角色认知边界未确认，却写成主角已经知道门牌规则。',
                    fix: '下一章必须补齐角色状态和认知边界，不能把未就绪来源写成既定事实。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门牌来源',
        summary: '主角先确认上一章门牌变化来源，再行动。',
        conflict: '门牌规则可用，但角色认知边界仍未补齐。',
        ending_hook: '门牌背面出现上一章遗漏的编号。',
        scene_cards: [
          { scene_no: 1, title: '补齐来源', reader_payoff: '来源就绪缺口被转成当前行动依据。' },
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
      { chapter_no: 3, title: '门牌来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('来源就绪：来源缺口 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).not.toContain('状态筛选：上下文缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('上一章正文来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('角色状态和认知边界')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('来源就绪：来源缺口 2')
    expect(prompt).toContain('未就绪来源')
  })

  test('carries nested source readiness receipts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '补读来源' },
      [
        { id: 2, chapter_no: 2, title: '断章来源' },
        { id: 3, chapter_no: 3, title: '补读来源' },
      ],
      [
        {
          id: 214,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                oh_story_delivery_receipts: {
                  pre_draft_execution_receipts: {
                    source_readiness_checks: [
                      {
                        key: 'source_readiness_timeline',
                        label: '时间线来源',
                        status: 'fail',
                        evidence: '时间线来源未确认，却把门牌翻面时间写成既定事实。',
                        fix: '下一章先补时间线来源，再把门牌翻面时间写成角色能确认的行动依据。',
                      },
                    ],
                  },
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '补读来源',
        summary: '主角先补读时间线来源，再决定是否触发门牌。',
        conflict: '门牌翻面可用，但时间线来源未确认。',
        ending_hook: '时间线背后出现新断点。',
        scene_cards: [
          { scene_no: 1, title: '补读时间线', reader_payoff: '来源缺口转成当前行动依据。' },
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
      { chapter_no: 3, title: '补读来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('来源就绪：来源缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('时间线来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门牌翻面时间')
    expect(prompt).toContain('来源就绪：来源缺口 1')
    expect(prompt).toContain('补时间线来源')
  })

  test('carries source readiness execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '旧档案缺页' },
      [
        { id: 3, chapter_no: 3, title: '门牌来源' },
        { id: 4, chapter_no: 4, title: '旧档案缺页' },
      ],
      [
        {
          id: 216,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:27:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                source_readiness_checks: [
                  {
                    key: 'source_archive_missing',
                    label: '旧档案来源',
                    status: 'fail',
                    source_name: '旧档案第七页',
                    source_path: '设定/旧档案.md#第七页',
                    read_status: 'missing',
                    used_as_fact: true,
                    chapter_evidence: '正文直接说第七页证明门牌归属。',
                    evidence: '旧档案第七页未读，却被写成铁证。',
                    fix: '下一章必须先找到第七页残片，才能让门牌归属成为行动依据。',
                    remaining_risk: '不能继续把未读档案当成既定事实。',
                  },
                  {
                    key: 'source_character_ready',
                    label: '角色状态来源',
                    status: 'pass',
                    source_name: '角色状态表',
                    source_path: '状态/角色.md',
                    read_status: 'ready',
                    used_as_fact: false,
                    chapter_evidence: '已按角色状态表限制主角认知。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '旧档案缺页',
        summary: '主角先找到旧档案第七页残片，再判断门牌归属。',
        conflict: '档案缺页会误导门牌归属。',
        ending_hook: '第七页残片背面出现新门牌编号。',
        scene_cards: [
          { scene_no: 1, title: '找第七页', reader_payoff: '来源就绪缺口变成可见取证动作。' },
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
      { chapter_no: 4, title: '旧档案缺页' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('来源就绪：来源缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_readiness_checks.旧档案来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧档案第七页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('设定/旧档案.md#第七页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('read_status=missing')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('used_as_fact=true')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('角色状态表')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('来源就绪')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('未就绪来源')
    expect(prompt).toContain('source_readiness_checks.旧档案来源')
    expect(prompt).toContain('不能继续把未读档案当成既定事实')
  })

  test('carries nested status filter receipts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '状态补线' },
      [
        { id: 2, chapter_no: 2, title: '错读状态' },
        { id: 3, chapter_no: 3, title: '状态补线' },
      ],
      [
        {
          id: 215,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                oh_story_delivery_receipts: {
                  pre_draft_execution_receipts: {
                    status_filter_receipts: [
                      {
                        key: 'character_state_boundary',
                        label: '角色认知边界',
                        used_in_chapter: true,
                        evidence: '主角还没看到旧印回光，却提前知道门牌归属。',
                        excluded_reason: '',
                        remaining_risk: '下一章必须把角色认知边界补成可见证据，不能继续让主角提前知道门牌归属。',
                      },
                    ],
                  },
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '状态补线',
        summary: '主角先看到旧印回光，再确认门牌归属。',
        conflict: '门牌归属可推断，但角色认知边界不能跳过。',
        ending_hook: '旧印回光照出新名字。',
        scene_cards: [
          { scene_no: 1, title: '补角色认知', reader_payoff: '状态筛选缺口变成可见证据。' },
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
      { chapter_no: 3, title: '状态补线' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修状态筛选')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('状态筛选：上下文缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('角色认知边界')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门牌归属')
    expect(prompt).toContain('状态筛选：上下文缺口 1')
    expect(prompt).toContain('角色认知边界补成可见证据')
  })

  test('carries duplicate chapter title sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '校徽敲门' },
      [
        { id: 1, chapter_no: 1, title: '第1章 门外学生' },
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '校徽敲门' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'chapter_title_uniqueness_sync',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            chapter_title_uniqueness_sync: {
              status: 'warn',
              label: '章节标题重复 1',
              missed_count: 1,
              duplicates: [{ chapter_no: 1, title: '第1章 门外学生' }],
              missed: [{ chapter_no: 1, title: '第1章 门外学生' }],
              next_actions: ['下一章必须先修标题：按本章核心事件、冲突转折、关键资产或章尾钩子改名，并同步章节标题。'],
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
        title: '校徽敲门',
        summary: '校徽成为开门规则的新证据。',
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
      { chapter_no: 3, title: '校徽敲门' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章节标题')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修标题：章节标题重复 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('核心事件、冲突转折、关键资产或章尾钩子改名')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('修标题：章节标题重复 1')
    expect(prompt).toContain('核心事件、冲突转折、关键资产或章尾钩子改名')
  })

  test('carries prose review title uniqueness checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '半印缺页' },
      [
        { id: 1, chapter_no: 1, title: '第1章 门外学生' },
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '半印缺页' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:30.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                title_uniqueness_checks: [
                  {
                    key: 'title_duplicate',
                    label: '标题重复',
                    status: 'fail',
                    old_title: '门外学生',
                    new_title: '半印照出缺页',
                    outline_title_synced: false,
                    file_name_synced: false,
                    chapter_title_line_synced: false,
                    evidence: '旧标题与第1章重复，且正文开篇没有半印照缺页的差异化画面。',
                    remaining_risk: '需要同步大纲标题、文件名和正文标题行。',
                  },
                  {
                    key: 'title_line_synced',
                    label: '标题行同步',
                    status: 'pass',
                    evidence: '正文标题行已经更新。',
                    remaining_risk: '',
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
        title: '半印缺页',
        summary: '半枚旧印照出缺页背后的名字。',
        conflict: '追查缺页会触发禁库规则。',
        ending_hook: '缺页背面显出门外学生的死亡日期。',
        scene_cards: [
          { scene_no: 1, title: '半印入灯', reader_payoff: '让标题承诺变成可见画面。' },
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
      { chapter_no: 3, title: '半印缺页' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章节标题')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章节标题：标题缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半印照出缺页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('同步大纲标题、文件名和正文标题行')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('正文标题行已经更新')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('old_title')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('new_title')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('正文标题行')
    expect(prompt).toContain('章节标题：标题缺口 1')
    expect(prompt).toContain('旧标题与第1章重复')
    expect(prompt).toContain('半印照缺页')
  })

  test('carries prose review blueprint consumption checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 206,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                blueprint_consumption_checks: [
                  {
                    key: 'cost_reward',
                    label: '代价收益',
                    status: 'fail',
                    blueprint_field: 'cost_and_reward',
                    expected: '行动受阻后付出代价再拿奖励。',
                    delivered_evidence: '正文只写主角拿到门卡。',
                    missing_gap: '只给结果没有代价。',
                    fix: '下一章必须让主角先被禁库门拒绝，再用半印血线换一次门卡权限。',
                    remaining_risk: '章尾还要把门卡权限转成下一章承接。',
                  },
                  {
                    key: 'opening_hook',
                    label: '开篇钩子',
                    status: 'pass',
                    delivered_evidence: '开头有禁库门响。',
                    missing_gap: '',
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
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补细纲兑现')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('细纲兑现：执行缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半印血线换一次门卡权限')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('只给结果没有代价')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('开头有禁库门响')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('blueprint_field')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('expected')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('章尾还要把门卡权限转成下一章承接')
    expect(prompt).toContain('细纲兑现：执行缺口 1')
    expect(prompt).toContain('正文只写主角拿到门卡')
    expect(prompt).toContain('章尾还要把门卡权限转成下一章承接')
  })

  test('carries prose review word count checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 207,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:30.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                word_count_checks: [
                  {
                    key: 'min_required_count',
                    label: '字数下限',
                    status: 'warn',
                    current_count: 2400,
                    target_count: 4200,
                    min_required_count: 3600,
                    evidence: '正文低于字数下限，关键动作只写结果。',
                    remaining_risk: '不得靠环境描写、重复情绪或内心独白凑字数。',
                    fix: '下一章扩写动作过程、选择代价、对话交锋和章末钩子铺垫。',
                  },
                  {
                    key: 'format_count',
                    label: '格式统计',
                    status: 'pass',
                    evidence: '段落完整。',
                    remaining_risk: '',
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
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补字数执行')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('字数执行：扩写缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('current_count=2400')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('扩写动作过程、选择代价、对话交锋')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('段落完整')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('current_count')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('target_count')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('min_required_count')
    expect(prompt).toContain('字数执行：扩写缺口 1')
    expect(prompt).toContain('正文低于字数下限')
    expect(prompt).toContain('不得靠环境描写、重复情绪或内心独白凑字数')
  })

  test('carries prose review chapter benchmark checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 208,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                chapter_benchmark_checks: [
                  {
                    key: 'rhythm_benchmark',
                    label: '对标章节节奏基准',
                    status: 'warn',
                    benchmark_dimension: '节奏基准',
                    expected_method: '开局压迫、三段升级、章尾回收，只学节奏不复制桥段。',
                    delivered_evidence: '正文中段直接跳到拿门卡，没有三段升级。',
                    originality_guard: '不得复制对标章门派审判桥段和原句。',
                    fix: '下一章按开局压迫、三段升级和章尾回收重排门卡事件。',
                    remaining_risk: '章尾需要回收门卡权限并承接下一层禁令。',
                  },
                  {
                    key: 'copy_guard',
                    label: '原创边界',
                    status: 'pass',
                    delivered_evidence: '没有复制原句。',
                    originality_guard: '已遵守。',
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
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补章节基准')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章节基准：基准缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('开局压迫、三段升级和章尾回收')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不得复制对标章门派审判桥段和原句')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('没有复制原句')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('benchmark_dimension')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('expected_method')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('originality_guard')
    expect(prompt).toContain('章节基准：基准缺口 1')
    expect(prompt).toContain('正文中段直接跳到拿门卡')
    expect(prompt).toContain('下一层禁令')
  })

  test('carries prose review creation quality checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 209,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:30.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                innovation_checks: [
                  {
                    key: 'rule_contrast',
                    label: '创新执行',
                    status: 'warn',
                    innovation_type: '规则反差',
                    differentiating_mechanism: '用半印血线反制禁库门规。',
                    visualized_scene: '门规读数沿血线倒转。',
                    reader_retellable_hook: '玄灯许可在裂纹里亮起。',
                    long_term_fit: '服务超人规则怪谈的核心卖点。',
                    fix: '下一章必须把半印血线写成规则反差和可视化IP场面。',
                  },
                ],
                chapter_attraction_checks: [
                  {
                    key: 'opening_to_page_turn',
                    label: '吸引力缺口',
                    status: 'fail',
                    attraction_dimension: '开篇钩子到章末翻页',
                    opening_hook: '开篇没有反常响动。',
                    scene_goal_obstacle_turn_reward: '缺目标阻碍转折回报。',
                    ending_page_turn: '章末没有黑塔许可选择。',
                    fix: '下一章开篇给旧城门反常响动，中段补目标阻碍转折回报，章末留下黑塔许可选择。',
                  },
                ],
                story_drive_checks: [
                  {
                    key: 'protagonist_choice',
                    label: '故事驱动',
                    status: 'warn',
                    protagonist_choice: '主角没有主动押上裂纹阵盘。',
                    obstacle: '执事封锁资格。',
                    cost: '暴露暗伤。',
                    state_change: '转为主动入局。',
                    next_causality: '内门长老点名让他明日入塔。',
                    fix: '下一章必须写主角主动选择、明确阻碍、选择代价、状态变化和下一步因果。',
                  },
                ],
                character_arc_checks: [
                  {
                    key: 'growth_beat',
                    label: '人物弧光',
                    status: 'warn',
                    character: '李玄',
                    desire: '保住试炼资格。',
                    flaw_pressure: '害怕暴露裂纹阵盘。',
                    relationship_change: '主动向林青禾求证。',
                    growth_beat: '公开承认残阵缺陷。',
                    voice_anchor: '短句反问。',
                    fix: '下一章必须把欲望、缺陷受压、关系变化、成长节点和口吻锚点落成场景。',
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
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 4')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补创新')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创新：创新缺口 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修吸引力：吸引力缺口 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('故事力：驱动缺口 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('人物弧光：弧光缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('规则反差和可视化IP场面')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('黑塔许可选择')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('主动选择、明确阻碍、选择代价')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('公开承认残阵缺陷')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('故事力开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('protagonist_choice')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('cost')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_causality')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('人物弧光开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('relationship_change')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('voice_anchor')
    expect(prompt).toContain('创新：创新缺口 1')
    expect(prompt).toContain('修吸引力：吸引力缺口 1')
    expect(prompt).toContain('故事力：驱动缺口 1')
    expect(prompt).toContain('人物弧光：弧光缺口 1')
  })

  test('carries prose review core contract checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 212,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:45.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                core_contract_checks: [
                  {
                    key: 'core_promise_drift',
                    label: '核心承诺漂移',
                    status: 'fail',
                    core_promise: '超人力量与规则怪谈互相反制，带来可见翻盘。',
                    mainline_service: '本章只在查门卡，没有让门卡规则改变胜负。',
                    core_emotion: '压迫后反制的爽感不足。',
                    rule_judgement: '门卡规则没有参与胜负判定。',
                    ending_question: '章末没有把半格权限转成下一章新问题。',
                    evidence: '主角拿到门卡后只是离开禁库门。',
                    fix: '下一章必须让半格门卡权限当场限制主角，再被半印血线反制，章尾留下黑塔许可的新问题。',
                    remaining_risk: '不能继续写成单纯查案或解释规则。',
                  },
                  {
                    key: 'core_contract_ok',
                    label: '核心契约已兑现',
                    status: 'pass',
                    core_promise: '旧城规则反制。',
                    evidence: '正文已有规则反制。',
                    fix: '',
                    remaining_risk: '',
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
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：核心承诺缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('core_contract_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('超人力量与规则怪谈互相反制')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半格门卡权限当场限制主角')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('核心契约已兑现')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('规则判定')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('黑塔许可的新问题')
    expect(prompt).toContain('创作契约：核心承诺缺口 1')
    expect(prompt).toContain('门卡规则没有参与胜负判定')
    expect(prompt).toContain('不能继续写成单纯查案或解释规则')
  })

  test('carries prose review banned word checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 210,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                banned_words_checks: [
                  {
                    key: 'mode_one_ai_signature',
                    label: '硬禁词',
                    status: 'fail',
                    matched_word: '命运齿轮',
                    level: 'hard',
                    location: 'ending',
                    replacement: '用门卡只亮半格权限的物理动作替代。',
                    evidence: '章末写了“命运齿轮开始转动”。',
                    remaining_risk: '下一章不得复现命运齿轮、此时此刻等模板表达。',
                  },
                  {
                    key: 'dialogue_tag',
                    label: '对白标签',
                    status: 'pass',
                    matched_word: '',
                    evidence: '对白无标签污染。',
                    remaining_risk: '',
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
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修禁用词')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('禁用词：硬禁缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('matched_word=命运齿轮')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门卡只亮半格权限')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对白无标签污染')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('matched_word')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('replacement')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('命运齿轮开始转动')
    expect(prompt).toContain('禁用词：硬禁缺口 1')
    expect(prompt).toContain('命运齿轮开始转动')
    expect(prompt).toContain('下一章不得复现命运齿轮')
  })

  test('carries prose review longform checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '黑塔许可' },
      [
        { id: 7, chapter_no: 7, title: '门卡代价' },
        { id: 8, chapter_no: 8, title: '黑塔许可' },
      ],
      [
        {
          id: 211,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:30.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                longform_checks: [
                  {
                    key: 'recent_progress',
                    label: '长篇专项',
                    status: 'warn',
                    recent_5_chapter_progress: '最近5章主线没有明确进展。',
                    payoff_interval: '爽点间隔过长。',
                    stage_goal_shift: '阶段目标仍停在查门卡。',
                    next_stage_pull: '下一阶段牵引不足。',
                    context_layer: '黑塔许可线没有进入当前场景。',
                    evidence: '连续几章都在解释门卡规则，没有推进黑塔许可。',
                    fix: '下一章必须把黑塔许可写成新航点，用阶段目标推进、爽点回报和下一阶段牵引承接。',
                    remaining_risk: '不能继续写门卡规则原地解释。',
                  },
                  {
                    key: 'context_layer_ok',
                    label: '上下文层',
                    status: 'pass',
                    evidence: '角色状态已同步。',
                    remaining_risk: '',
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
        chapter_no: 8,
        title: '黑塔许可',
        summary: '主角拿门卡权限追到黑塔许可。',
        conflict: '黑塔许可要求更高阶段代价。',
        ending_hook: '许可编号背后露出下一阶段入口。',
        scene_cards: [
          { scene_no: 1, title: '许可显影', reader_payoff: '把黑塔许可写成新航点。' },
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
      { chapter_no: 8, title: '黑塔许可' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补长篇专项')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('长篇专项：长线缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('最近5章主线没有明确进展')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('阶段目标推进、爽点回报和下一阶段牵引')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('角色状态已同步')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('长篇专项开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('recent_5_chapter_progress')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('payoff_interval')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_stage_pull')
    expect(prompt).toContain('长篇专项：长线缺口 1')
    expect(prompt).toContain('连续几章都在解释门卡规则')
    expect(prompt).toContain('不能继续写门卡规则原地解释')
  })

  test('carries prose craft execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '签收印复核' },
      [
        { id: 7, chapter_no: 7, title: '旧名单显影' },
        { id: 8, chapter_no: 8, title: '签收印复核' },
      ],
      [
        {
          id: 212,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:40.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                prose_craft_checks: [
                  {
                    key: 'pov_body_anchor_missing',
                    label: '深度限知失焦',
                    status: 'fail',
                    pov_depth: '删掉“所有人都没发现”的上帝视角，只写沈砚能看见的签收印、呼吸和手背反应。',
                    body_detail: '把愤怒改成指节压白、喉结停住、袖口擦过印泥。',
                    environment_interaction: '让签收印蹭到门槛灰，灰线暴露编号被改过。',
                    action_stillness_balance: '一动一静交替：按印、停顿、抬眼、逼问。',
                    crowd_reaction_layering: '旁观者不能统一震惊，账房先沉默，执事抢话，旧仆后退。',
                    evidence: '本章连续用“所有人都震惊、他心里很愤怒”概括，缺身体细节和环境交互。',
                    fix: '下一章必须用深度限知、身体细节、环境交互和分层反应重写签收印复核场。',
                    remaining_risk: '不能再用上帝视角和抽象情绪替代现场动作。',
                  },
                  {
                    key: 'sensory_anchor_ok',
                    label: '感知锚点',
                    status: 'pass',
                    pov_depth: '已兑现。',
                    body_detail: '已兑现。',
                    environment_interaction: '已兑现。',
                    action_stillness_balance: '已兑现。',
                    crowd_reaction_layering: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '签收印复核',
        summary: '沈砚复核旧名单签收印，用可见动作压住对手。',
        conflict: '执事试图把签收印解释成普通印泥污渍。',
        ending_hook: '门槛灰线里露出被改过的编号。',
        scene_cards: [
          { scene_no: 1, title: '签收印复核', reader_payoff: '正文工艺字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:09:40.000Z',
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
      { chapter_no: 8, title: '签收印复核' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修正文工艺')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('正文工艺：行文缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('prose_craft_checks.深度限知失焦')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('pov_depth=删掉“所有人都没发现”的上帝视角')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('body_detail=把愤怒改成指节压白')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('environment_interaction=让签收印蹭到门槛灰')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action_stillness_balance=一动一静交替')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('crowd_reaction_layering=旁观者不能统一震惊')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('感知锚点')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('pov_depth')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('environment_interaction')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('crowd_reaction_layering')
    expect(prompt).toContain('prose_craft_checks.深度限知失焦')
    expect(prompt).toContain('不能再用上帝视角和抽象情绪替代现场动作')
  })

  test('carries punctuation tone execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '签收印追问' },
      [
        { id: 7, chapter_no: 7, title: '旧名单显影' },
        { id: 8, chapter_no: 8, title: '签收印追问' },
      ],
      [
        {
          id: 214,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:42.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                punctuation_tone_checks: [
                  {
                    key: 'question_tone_flattened',
                    label: '质问语气被压平',
                    status: 'warn',
                    speaker: '沈砚',
                    punctuation_issue: '关键追问全写成句号，迟疑依赖省略号和破折号硬停顿。',
                    tone_intent: '签收印真假必须是逼问，不是平铺陈述。',
                    replacement: '用短句、换行和动作打断替代省略号/破折号，追问处保留问号。',
                    voice_difference: '沈砚冷静短问，执事抢话用短促否认，旧仆迟疑用动作停顿。',
                    evidence: '“这枚印是真的。”连续三句句号，缺质问压力和人物声线差异。',
                    fix: '下一章必须把签收印追问改成有问号、动作停顿和声线差异的对话交锋。',
                    remaining_risk: '不能再用统一句号和硬停顿抹平对白语气。',
                  },
                  {
                    key: 'colon_reveal_ok',
                    label: '信息落点',
                    status: 'pass',
                    speaker: '已兑现。',
                    punctuation_issue: '已兑现。',
                    tone_intent: '已兑现。',
                    replacement: '已兑现。',
                    voice_difference: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '签收印追问',
        summary: '沈砚用签收印追问执事，逼出旧名单编号。',
        conflict: '执事试图把质问降成普通陈述，拖掉现场压力。',
        ending_hook: '旧仆在沈砚的短问后说出另一个仓库编号。',
        scene_cards: [
          { scene_no: 1, title: '签收印追问', reader_payoff: '语气标点字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:09:42.000Z',
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
      { chapter_no: 8, title: '签收印追问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修语气标点')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('语气标点：标点缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('punctuation_tone_checks.质问语气被压平')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('speaker=沈砚')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('punctuation_issue=关键追问全写成句号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('tone_intent=签收印真假必须是逼问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('replacement=用短句、换行和动作打断替代省略号/破折号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('voice_difference=沈砚冷静短问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('信息落点')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('speaker')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('replacement')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('voice_difference')
    expect(prompt).toContain('punctuation_tone_checks.质问语气被压平')
    expect(prompt).toContain('不能再用统一句号和硬停顿抹平对白语气')
  })

  test('carries quality audit execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '签收印反压' },
      [
        { id: 7, chapter_no: 7, title: '旧名单显影' },
        { id: 8, chapter_no: 8, title: '签收印反压' },
      ],
      [
        {
          id: 215,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:44.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                quality_audit_checks: [
                  {
                    key: 'purpose_density_flat',
                    label: '目的词详略平均',
                    status: 'fail',
                    strategy: 'rewrite',
                    purpose_tag: '打脸/关键揭露',
                    density_change: '把签收印揭露从一句摘要扩成危机铺垫、出手过程、对话交锋、分层反应和结果余波。',
                    conflict_bound_info: '签收印编号必须随执事抢证、旧仆迟疑和主角反压逐步释放。',
                    changed_evidence: '下一章需要出现“编号被灰线截断，执事伸手抢印，沈砚按住账页”的现场变化。',
                    evidence: '本章把关键揭露写成一句解释，删掉不影响理解，事件内容比重不足。',
                    fix: '下一章必须按打脸/关键揭露目的词重排详略，让信息跟冲突走，并制造不可删除的局势变化。',
                    remaining_risk: '不能再用摘要式解释替代事件推进。',
                  },
                  {
                    key: 'opening_hook_ok',
                    label: '开篇钩子',
                    status: 'pass',
                    strategy: 'polish',
                    purpose_tag: '已兑现。',
                    density_change: '已兑现。',
                    conflict_bound_info: '已兑现。',
                    changed_evidence: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '签收印反压',
        summary: '沈砚用签收印编号反压执事，制造不可删除的局势变化。',
        conflict: '执事抢证，旧仆迟疑，签收印编号必须随冲突释放。',
        ending_hook: '编号背后的旧仓库门禁亮起。',
        scene_cards: [
          { scene_no: 1, title: '签收印反压', reader_payoff: '质量诊断字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:09:44.000Z',
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
      { chapter_no: 8, title: '签收印反压' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修质量诊断')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量诊断：诊断缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('quality_audit_checks.目的词详略平均')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('strategy=rewrite')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('purpose_tag=打脸/关键揭露')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('density_change=把签收印揭露从一句摘要扩成危机铺垫')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('conflict_bound_info=签收印编号必须随执事抢证')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('changed_evidence=下一章需要出现“编号被灰线截断')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('开篇钩子')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('purpose_tag')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('density_change')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('changed_evidence')
    expect(prompt).toContain('quality_audit_checks.目的词详略平均')
    expect(prompt).toContain('不能再用摘要式解释替代事件推进')
  })

  test('carries prose review foreshadowing delta checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '黑塔许可' },
      [
        { id: 7, chapter_no: 7, title: '门卡代价' },
        { id: 8, chapter_no: 8, title: '黑塔许可' },
      ],
      [
        {
          id: 213,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:45.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                foreshadowing_delta_checks: [
                  {
                    key: 'missing_tracking_entry',
                    label: '新增伏笔未登记',
                    status: 'fail',
                    clue_name: '第二枚旧印缺编号',
                    delta_type: '新增',
                    current_status: '已入场但未登记台账',
                    chapter: '第7章',
                    source_excerpt: '旧印背面露出一块被刮掉的编号。',
                    ledger_path: '伏笔台账/黑塔许可.md',
                    fix: '下一章必须让第二枚旧印缺编号作为可见线索入场，并把缺编号转成黑塔许可问题。',
                    remaining_risk: '不能继续只写门卡规则，必须同步伏笔台账路径和当前状态。',
                  },
                  {
                    key: 'foreshadowing_delta_ok',
                    label: '伏笔增量已登记',
                    status: 'pass',
                    clue_name: '门卡裂纹',
                    source_excerpt: '门卡裂纹已写回台账。',
                    ledger_path: '伏笔台账/门卡.md',
                    fix: '',
                    remaining_risk: '',
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
        chapter_no: 8,
        title: '黑塔许可',
        summary: '主角拿门卡权限追到黑塔许可。',
        conflict: '黑塔许可要求更高阶段代价。',
        ending_hook: '许可编号背后露出下一阶段入口。',
        scene_cards: [
          { scene_no: 1, title: '许可显影', reader_payoff: '把黑塔许可写成新航点。' },
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
      { chapter_no: 8, title: '黑塔许可' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补伏笔增量')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('伏笔增量：台账缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('foreshadowing_delta_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('第二枚旧印缺编号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('伏笔台账/黑塔许可.md')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('门卡裂纹已写回台账')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('可见线索')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('黑塔许可问题')
    expect(prompt).toContain('伏笔增量：台账缺口 1')
    expect(prompt).toContain('旧印背面露出一块被刮掉的编号')
    expect(prompt).toContain('必须同步伏笔台账路径和当前状态')
  })

  test('carries prose review story state update checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '黑塔许可' },
      [
        { id: 7, chapter_no: 7, title: '门卡代价' },
        { id: 8, chapter_no: 8, title: '黑塔许可' },
      ],
      [
        {
          id: 214,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:50.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                story_state_update_checks: [
                  {
                    key: 'character_updates_missing',
                    label: '角色状态未写回',
                    status: 'fail',
                    state_domain: 'character',
                    target_file: '追踪/角色状态.md',
                    update_path: 'character_updates.周远',
                    before_state: '昏迷未醒',
                    after_state: '短暂苏醒但行动受限',
                    source_excerpt: '周远醒来只撑住半句话，手臂仍不能抬。',
                    evidence: '正文让周远醒来，但状态机仍停在昏迷未醒。',
                    fix: '下一章必须让周远行动受限影响黑塔许可调查选择，并把短暂苏醒写成可追踪状态变化。',
                    remaining_risk: '不能让周远像完全恢复一样参与行动。',
                  },
                  {
                    key: 'asset_updates_ok',
                    label: '资产状态已写回',
                    status: 'pass',
                    state_domain: 'asset',
                    target_file: '追踪/资产状态.md',
                    update_path: 'asset_updates.门卡',
                    before_state: '门卡未激活',
                    after_state: '门卡半格权限',
                    source_excerpt: '门卡只亮了半格。',
                    evidence: '门卡状态已同步。',
                    fix: '',
                    remaining_risk: '',
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
        chapter_no: 8,
        title: '黑塔许可',
        summary: '主角拿门卡权限追到黑塔许可。',
        conflict: '黑塔许可要求更高阶段代价。',
        ending_hook: '许可编号背后露出下一阶段入口。',
        scene_cards: [
          { scene_no: 1, title: '许可显影', reader_payoff: '把黑塔许可写成新航点。' },
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
      { chapter_no: 8, title: '黑塔许可' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修状态写回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('状态写回：状态缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('story_state_update_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_updates.周远')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('短暂苏醒但行动受限')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('门卡状态已同步')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('状态变化')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('行动后果')
    expect(prompt).toContain('状态写回：状态缺口 1')
    expect(prompt).toContain('周远醒来只撑住半句话')
    expect(prompt).toContain('不能让周远像完全恢复一样参与行动')
  })

  test('carries high severity prose review findings into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 72,
                passed: false,
                issues: [
                  {
                    severity: 'S2',
                    category: 'logic',
                    location: '章末',
                    evidence: '门外学生突然消失，没人追问他的来历。',
                    issue: '章末悬念没有转成下一章调查目标。',
                    fix: '下一章开篇必须让主角追查湿漉漉学生身份，并给出第一条证据。',
                  },
                  {
                    severity: 'S4',
                    category: 'style',
                    evidence: '局部句子重复。',
                    issue: '句式略重复。',
                    fix: '润色即可。',
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

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复盘审稿：S2问题 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章开篇必须让主角追查湿漉漉学生身份')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('润色即可')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('湿漉漉学生身份')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('第一条证据')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('门外学生突然消失')
    expect(prompt).toContain('复盘审稿：S2问题 1')
    expect(prompt).toContain('门外学生突然消失')
    expect(prompt).toContain('下一章开篇必须让主角追查湿漉漉学生身份')
  })

  test('asks prose review to output a next-chapter quality continuity plan', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(reviewPrompt).toContain('next_chapter_quality_plan')
    expect(reviewPrompt).toContain('quality_focus')
    expect(reviewPrompt).toContain('opening_actions')
    expect(reviewPrompt).toContain('middle_actions')
    expect(reviewPrompt).toContain('ending_actions')
    expect(reviewPrompt).toContain('avoid_repetition')
    expect(reviewPrompt).toContain('evidence_basis')
    expect(reviewPrompt).toContain('ending_contract')
    expect(reviewPrompt).toContain('final_state')
    expect(reviewPrompt).toContain('unresolved_question')
    expect(reviewPrompt).toContain('next_chapter_pull')
    expect(reviewPrompt).toContain('handoff_to_next')
  })

  test('asks prose revision to output a final next-chapter quality continuity plan', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(revisionPrompt).toContain('next_chapter_quality_plan')
    expect(revisionPrompt).toContain('quality_focus')
    expect(revisionPrompt).toContain('opening_actions')
    expect(revisionPrompt).toContain('middle_actions')
    expect(revisionPrompt).toContain('ending_actions')
    expect(revisionPrompt).toContain('avoid_repetition')
    expect(revisionPrompt).toContain('evidence_basis')
    expect(revisionPrompt).toContain('ending_contract')
    expect(revisionPrompt).toContain('final_state')
    expect(revisionPrompt).toContain('unresolved_question')
    expect(revisionPrompt).toContain('next_chapter_pull')
    expect(revisionPrompt).toContain('handoff_to_next')
    expect(revisionPrompt).toContain('修订后')
    expect(revisionPrompt).toContain('next_chapter_quality_plan_receipts')
  })

  test('carries next-chapter quality plan into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 206,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 82,
                passed: true,
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['把门外学生身份追查变成下一章主目标。'],
                  opening_actions: ['前300字让主角拿水迹样本验证门外学生身份。'],
                  middle_actions: ['中段让玻璃门规则反制蛮力，形成新信息。'],
                  ending_actions: ['章末用校徽反光露出第二条规则。'],
                  avoid_repetition: ['不要再用“他知道，这只是开始”总结体收尾。'],
                  evidence_basis: ['上一章章末只留下门外学生消失，没有行动压力。'],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('质量续航：下一章计划')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外学生身份追查变成下一章主目标')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字让主角拿水迹样本验证门外学生身份')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('玻璃门规则反制蛮力')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('校徽反光露出第二条规则')
    expect(brief.write_preparation_brief.delivery_risk_actions.join('｜')).toContain('前300字让主角拿水迹样本验证门外学生身份')
    expect(brief.write_preparation_brief.delivery_risk_actions.join('｜')).toContain('玻璃门规则反制蛮力')
    expect(brief.write_preparation_brief.delivery_risk_actions.join('｜')).toContain('校徽反光露出第二条规则')
    expect(brief.write_preparation_brief.must_confirm.join('｜')).toContain('前300字让主角拿水迹样本验证门外学生身份')
    expect(prompt).toContain('质量续航：下一章计划')
    expect(prompt).toContain('不要再用“他知道，这只是开始”总结体收尾')
    expect(prompt).toContain('上一章章末只留下门外学生消失')
    expect(prompt).toContain('next_chapter_quality_plan_receipts')
  })

  test('carries next-chapter quality plan ending contracts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 207,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 84,
                passed: true,
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['下一章必须接住校徽反光，不改成新支线。'],
                  opening_actions: ['前300字让主角用半枚校徽反光定位值班室。'],
                  middle_actions: ['中段让第二条规则改变救人判断。'],
                  ending_actions: ['章末让值班室名单出现主角母亲旧名。'],
                  avoid_repetition: ['不要再用门口犹豫开篇。'],
                  evidence_basis: ['上一章最后只剩半枚校徽反光，没有解释第二条规则。'],
                  ending_contract: {
                    final_state: '门外学生消失后，玻璃门只剩半枚校徽反光。',
                    unresolved_question: '第二条规则是谁写在校徽背面？',
                    next_chapter_pull: '值班室名单里出现主角母亲旧名。',
                    handoff_to_next: '开篇必须从半枚校徽反光直接追到值班室名单。',
                  },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('上章最后状态：门外学生消失后，玻璃门只剩半枚校徽反光')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('开篇必须从半枚校徽反光直接追到值班室名单')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('未解决问题：第二条规则是谁写在校徽背面')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('下一章推动力：值班室名单里出现主角母亲旧名')
    expect(prompt).toContain('ending_contract')
    expect(prompt).toContain('final_state')
    expect(prompt).toContain('第二条规则是谁写在校徽背面')
    expect(prompt).toContain('开篇必须从半枚校徽反光直接追到值班室名单')
  })

  test('turns next-chapter avoid-repetition plan into forbidden repeats', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 208,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['把门外学生身份追查变成下一章主目标。'],
                  opening_actions: ['前300字让主角拿水迹样本验证门外学生身份。'],
                  avoid_repetition: ['不要再用“他知道，这只是开始”总结体收尾。'],
                  evidence_basis: ['上一章章末只留下门外学生消失，没有行动压力。'],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(deliveryRiskCarryOver?.forbidden_repeats).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(brief.delivery_risk_carry_over.forbidden_repeats).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(brief.forbidden_content).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(context.chapter_target.forbidden_content).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(prompt).toContain('禁用重复：不要再用“他知道，这只是开始”总结体收尾。')
  })

  test('carries nested next-chapter quality plan from oh-story delivery receipts', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '校徽反光' },
      [
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '校徽反光' },
      ],
      [
        {
          id: 209,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 78,
                passed: false,
              },
              revision: {
                oh_story_delivery_receipts: {
                  next_chapter_quality_plan: {
                    version: 'oh_story_next_chapter_quality_plan_v1',
                    quality_focus: ['嵌套计划：下一章必须追查校徽反光里的第二条规则。'],
                    opening_actions: ['嵌套计划：前300字用校徽反光定位值班室名单。'],
                    middle_actions: ['嵌套计划：中段让假学生被门禁反噬。'],
                    ending_actions: ['嵌套计划：章末让名单缺页指向新门牌。'],
                    avoid_repetition: ['嵌套计划：不要再用门口犹豫开篇。'],
                    evidence_basis: ['嵌套计划来自修订后 oh_story_delivery_receipts。'],
                  },
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
        title: '校徽反光',
        summary: '追查校徽反光里的第二条规则。',
        conflict: '假学生消失，但校徽反光留下新证据。',
        ending_hook: '名单缺页背面出现新门牌。',
        scene_cards: [
          { scene_no: 1, title: '校徽定位', reader_payoff: '校徽反光定位值班室名单。' },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '校徽反光' })

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('质量续航：下一章计划')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('嵌套计划：下一章必须追查校徽反光里的第二条规则')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('嵌套计划：前300字用校徽反光定位值班室名单')
    expect(brief.forbidden_content).toContain('嵌套计划：不要再用门口犹豫开篇。')
    expect(prompt).toContain('嵌套计划：前300字用校徽反光定位值班室名单')
    expect(prompt).toContain('嵌套计划：不要再用门口犹豫开篇')
  })

  test('keeps next-chapter quality plan in normalized prose self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('next_chapter_quality_plan')
    expect(reviewBlock).toContain('reviewPayload?.next_chapter_quality_plan')
    expect(reviewBlock).toContain('reviewPayload?.nextChapterQualityPlan')
    expect(reviewBlock).toContain('reviewPayloadDeliveryReceipts')
    expect(reviewBlock).toContain('reviewPayloadDeliveryReceipts?.next_chapter_quality_plan')
    expect(reviewBlock).toContain('reviewPayloadDeliveryReceipts?.nextChapterQualityPlan')
  })

  test('treats a missing next-chapter quality plan as a prose revision trigger', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionDecisionBlock = source.slice(
      source.indexOf('const nextChapterQualityPlanNeedsRepair'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const normalizedReview = {')),
    )

    expect(revisionDecisionBlock).toContain('nextChapterQualityPlanNeedsRepair')
    expect(revisionDecisionBlock).toContain('quality_focus')
    expect(revisionDecisionBlock).toContain('opening_actions')
    expect(revisionDecisionBlock).toContain('middle_actions')
    expect(revisionDecisionBlock).toContain('ending_actions')
    expect(revisionDecisionBlock).toContain('avoid_repetition')
    expect(revisionDecisionBlock).toContain('evidence_basis')
    expect(revisionDecisionBlock).toContain('ending_contract')
    expect(revisionDecisionBlock).toContain('final_state')
    expect(revisionDecisionBlock).toContain('unresolved_question')
    expect(revisionDecisionBlock).toContain('next_chapter_pull')
    expect(revisionDecisionBlock).toContain('handoff_to_next')
    expect(revisionDecisionBlock).toContain('hasNextChapterQualityPlanConcern')
    expect(reviewNormalizeBlock).toContain('const hasNextChapterQualityPlanConcern = nextChapterQualityPlanNeedsRepair(normalizedReview)')
    expect(reviewNormalizeBlock).toContain('normalizedReview.needs_revision =')
    expect(reviewNormalizeBlock).toContain('|| hasNextChapterQualityPlanConcern')
  })

  test('keeps final next-chapter quality plan in prose revision result', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionStart = source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')
    const revisionBlock = source.slice(
      revisionStart,
      source.indexOf('next_chapter_quality_plan: revisionNextChapterQualityPlan', revisionStart) + 'next_chapter_quality_plan: revisionNextChapterQualityPlan'.length + 40,
    )

    expect(revisionBlock).toContain('const revisionNextChapterQualityPlan =')
    expect(revisionBlock).toContain('revisedFirst?.next_chapter_quality_plan')
    expect(revisionBlock).toContain('revisedFirst?.nextChapterQualityPlan')
    expect(revisionBlock).toContain('revisionPayload?.next_chapter_quality_plan')
    expect(revisionBlock).toContain('revisionPayload?.nextChapterQualityPlan')
    expect(revisionBlock).toContain('next_chapter_quality_plan: revisionNextChapterQualityPlan')
  })

  test('prefers revised final next-chapter quality plan over stale initial review plan', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 207,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 71,
                passed: false,
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['旧计划：下一章只追门外学生。'],
                  opening_actions: ['旧计划：前300字继续站在门口犹豫。'],
                  middle_actions: ['旧计划：中段继续解释玻璃门。'],
                  ending_actions: ['旧计划：章末再写门外学生消失。'],
                  avoid_repetition: ['旧计划：避免旧收尾。'],
                  evidence_basis: ['旧计划来自初稿。'],
                },
              },
              revision: {
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['终稿计划：下一章改为追查校徽反光里的第二条规则。'],
                  opening_actions: ['终稿计划：前300字让主角用校徽反光定位第二条规则。'],
                  middle_actions: ['终稿计划：中段让门禁规则反噬假学生，形成新证据。'],
                  ending_actions: ['终稿计划：章末让第二条规则指向值班室名单。'],
                  avoid_repetition: ['终稿计划：不要再用初稿的门口犹豫开篇。'],
                  evidence_basis: ['终稿已经把门外学生消失改成校徽反光证据。'],
                },
              },
            },
          }),
        },
      ],
    )
    const allActions = [
      ...(deliveryRiskCarryOver?.items || []),
      ...(deliveryRiskCarryOver?.required_actions || []),
      ...(deliveryRiskCarryOver?.opening_actions || []),
      ...(deliveryRiskCarryOver?.middle_actions || []),
      ...(deliveryRiskCarryOver?.ending_actions || []),
    ].join('｜')

    expect(allActions).toContain('终稿计划：下一章改为追查校徽反光里的第二条规则')
    expect(allActions).toContain('终稿计划：前300字让主角用校徽反光定位第二条规则')
    expect(allActions).toContain('终稿计划：中段让门禁规则反噬假学生')
    expect(allActions).toContain('终稿计划：章末让第二条规则指向值班室名单')
    expect(allActions).not.toContain('旧计划：下一章只追门外学生')
    expect(allActions).not.toContain('旧计划：前300字继续站在门口犹豫')
  })

  test('carries high severity oh-story findings alias into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 71,
                passed: false,
                findings: [
                  {
                    severity: 'S1',
                    category: 'structure',
                    location: '章尾',
                    evidence: '主角拿到名单后直接睡下，没有验证第三个名字。',
                    issue: '关键证据没有转成下一章行动压力。',
                    fix: '下一章开篇必须让主角立刻验证第三个名字，并遇到阻拦。',
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

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复盘审稿：S1问题 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章开篇必须让主角立刻验证第三个名字')
    expect(prompt).toContain('复盘审稿：S1问题 1')
    expect(prompt).toContain('主角拿到名单后直接睡下')
    expect(prompt).toContain('下一章开篇必须让主角立刻验证第三个名字')
  })

  test('carries low five-dimension quality scores into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                five_dimension_scores: {
                  core_consistency: { score: 72, evidence: '核心冲突从守规救人偏成宿舍闲聊。', fix: '下一章开篇必须让门外学生身份和第一条规则重新形成正面冲突。' },
                  readability: { score: 69, evidence: '章末仍有“他知道，这只是开始”式总结。', fix: '下一章章末必须用现场证据或动作反转收束。' },
                  logic_coherence: { score: 82, evidence: '因果基本成立。' },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量五维：低分维度 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外学生身份和第一条规则重新形成正面冲突')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('现场证据或动作反转收束')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('正面冲突')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('他知道，这只是开始')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('现场证据或动作反转收束')
    expect(prompt).toContain('质量五维：低分维度 2')
    expect(prompt).toContain('核心冲突从守规救人偏成宿舍闲聊')
    expect(prompt).toContain('他知道，这只是开始')
  })

  test('carries readability ai smell findings into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'readability_review',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            readability_review: {
              readability_score: 73,
              passed: false,
              ai_smell: {
                level: '中度',
                pattern_hits: [
                  { type: '章末总结体', evidence: '他知道，这只是开始。', location: '章末' },
                  { type: '抽象心理', evidence: '一种复杂的情绪涌上心头。', location: '中段' },
                ],
                rewrite_tactics: [
                  '下一章用可见动作和具体物件替代抽象心理。',
                  '章末必须用现场反转或新证据收束，不写总结句。',
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

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('去AI味：AI味中度 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章用可见动作和具体物件替代抽象心理')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('他知道，这只是开始')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('可读性开篇去AI味')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('具体物件')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('他知道，这只是开始')
    expect(prompt).toContain('去AI味：AI味中度 2')
    expect(prompt).toContain('章末必须用现场反转或新证据收束')
    expect(prompt).toContain('一种复杂的情绪涌上心头')
  })

  test('carries missed delivery risk receipts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 206,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                score: 82,
                passed: true,
                delivery_risk_receipts: [
                  {
                    risk_item: '复盘审稿：S2问题 1',
                    required_action: '开篇追查湿漉漉学生身份。',
                    delivered: false,
                    evidence: '',
                    remaining_risk: '湿漉漉学生身份仍没有被追查，只写了宿舍环境。',
                  },
                  {
                    risk_item: '去AI味：AI味中度 2',
                    required_action: '章末用现场反转收束。',
                    delivered: true,
                    evidence: '水迹拼出第二个名字。',
                    remaining_risk: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复核承接：承接残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('湿漉漉学生身份仍没有被追查')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('章末用现场反转收束')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('开篇追查湿漉漉学生身份')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('只写了宿舍环境')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('湿漉漉学生身份仍没有被追查')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).not.toContain('不得拖到中段或章末补一句')
    expect(prompt).toContain('复核承接：承接残留 1')
    expect(prompt).toContain('湿漉漉学生身份仍没有被追查')
  })

  test('carries generic failed quality gate issues into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '水迹名单' },
      [
        { id: 4, chapter_no: 4, title: '水迹名字' },
        { id: 5, chapter_no: 5, title: '水迹名单' },
      ],
      [
        {
          id: 207,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                score: 71,
                passed: false,
                issues: [
                  {
                    severity: 'medium',
                    category: 'opening',
                    description: '开篇三段都在交代宿舍背景，没有冲突触发。',
                    suggestion: '下一章前300字用玻璃门新证据触发对抗。',
                  },
                  {
                    severity: 'low',
                    category: 'prose',
                    description: '个别句子略长。',
                    suggestion: '压短说明句。',
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
        chapter_no: 5,
        title: '水迹名单',
        summary: '主角追查水迹名单对应的旧床位。',
        conflict: '规则阻止他们公开查名单。',
        ending_hook: '名单末尾出现主角自己的名字。',
        scene_cards: [
          { scene_no: 1, title: '名单对抗', reader_payoff: '新证据触发当场对抗。' },
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
      { chapter_no: 5, title: '水迹名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修质量门禁')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量门禁：低分未过 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('玻璃门新证据触发对抗')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('压短说明句')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('玻璃门新证据触发对抗')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('开篇三段都在交代宿舍背景')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('质量分 71 低于 78')
    expect(prompt).toContain('质量门禁：低分未过 1')
    expect(prompt).toContain('开篇三段都在交代宿舍背景')
    expect(prompt).toContain('下一章前300字用玻璃门新证据触发对抗')
  })

  test('carries pending discovered assets into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 6, chapter_no: 6, title: '钥匙归属' },
      [
        { id: 5, chapter_no: 5, title: '水迹名单' },
        { id: 6, chapter_no: 6, title: '钥匙归属' },
      ],
      [
        {
          id: 208,
          chapter_id: 5,
          review_type: 'asset_intake',
          status: 'pending',
          created_at: '2026-06-09T08:09:00.000Z',
          payload: JSON.stringify({
            chapter_id: 5,
            chapter_no: 5,
            discovered_assets: [
              {
                entity_type: 'character',
                name: '周远',
                summary: '新来的宿舍管理员，掌握禁闭室钥匙。',
                evidence: '周远站在门口，手里转着一枚黑色钥匙。',
              },
              {
                entity_type: 'item',
                name: '黑色钥匙',
                summary: '能打开禁闭室，离身会触发广播警告。',
                evidence: '黑色钥匙落在掌心时，广播忽然停顿。',
              },
            ],
            applied_asset_names: [],
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 6,
        title: '钥匙归属',
        summary: '主角追查黑色钥匙为什么会触发广播。',
        conflict: '周远拒绝交代钥匙来源。',
        ending_hook: '钥匙齿痕对应禁闭室门后的旧编号。',
        scene_cards: [
          { scene_no: 1, title: '钥匙追问', reader_payoff: '确认周远和黑色钥匙不是一次性道具。' },
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
      { chapter_no: 6, title: '钥匙归属' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先确认新资产')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('新资产入库：待确认 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('周远')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('黑色钥匙')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('新资产开篇确认')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('周远')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('状态、归属、限制或关系变化')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('黑色钥匙')
    expect(prompt).toContain('新资产入库：待确认 2')
    expect(prompt).toContain('周远站在门口')
    expect(prompt).toContain('黑色钥匙落在掌心')
  })

  test('carries pending IP scene candidates into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '门槛白线' },
      [
        { id: 6, chapter_no: 6, title: '钥匙归属' },
        { id: 7, chapter_no: 7, title: '门槛白线' },
      ],
      [
        {
          id: 209,
          chapter_id: 6,
          review_type: 'ip_scene_intake',
          status: 'ready',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            ip_scene_candidates: [
              {
                title: '玻璃门内外对峙',
                summary: '门外湿漉漉学生敲门，门内三人被规则边界困住。',
                visual_hook: '黑暗贴着玻璃爬动，门槛白线像判定边界。',
                adaptation_value: '适合短剧第一集结尾和漫剧分镜。',
                spread_point: '救不救门外学生的评论区争议。',
                evidence: '湿漉漉的校服男生站在玻璃门外。',
                source_excerpt: '玻璃门外的黑暗贴着门槛蠕动。',
                tags: ['短剧钩子', '规则怪谈强画面'],
              },
            ],
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '门槛白线',
        summary: '主角确认玻璃门门槛白线的判定边界。',
        conflict: '门外学生逼迫他们越过白线救人。',
        ending_hook: '白线后退半步，露出门内曾经站过第四个人。',
        scene_cards: [
          { scene_no: 1, title: '白线试探', reader_payoff: '延展玻璃门内外对峙的强画面。' },
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
      { chapter_no: 7, title: '门槛白线' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先延展IP场面')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('IP场面延展：待延展 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('玻璃门内外对峙')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门槛白线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('短剧第一集结尾')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('IP场面开篇延展')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('黑暗贴着玻璃爬动')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('行动、冲突或章末钩子')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('短剧第一集结尾')
    expect(prompt).toContain('IP场面延展：待延展 1')
    expect(prompt).toContain('玻璃门内外对峙')
    expect(prompt).toContain('救不救门外学生')
  })

  test('carries failed platform rubric checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 207,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                rubric: 'fanqie',
                rubric_source: 'oh_story_embedded_fallback',
                platform_checks: [
                  {
                    key: 'opening_hook',
                    label: '前三段钩子',
                    status: 'fail',
                    evidence: '前三段都在解释宿舍规则，没有现场事件。',
                    fix: '下一章开篇改成对手当众撕毁证据。',
                  },
                  {
                    key: 'emotional_feedback',
                    label: '情绪回报',
                    status: 'warn',
                    evidence: '主角只分析规则，缺少被羞辱后的反击反馈。',
                    fix: '下一章补一个让主角当场赢回主动权的小反转。',
                  },
                  {
                    key: 'ending_hook',
                    label: '章末钩子',
                    status: 'pass',
                    evidence: '水迹拼出第二个名字。',
                    fix: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修平台适配')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('平台适配：平台缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('对手当众撕毁证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('主角当场赢回主动权')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('水迹拼出第二个名字')
    expect(prompt).toContain('平台适配：平台缺口 2')
    expect(prompt).toContain('前三段都在解释宿舍规则')
    expect(prompt).toContain('下一章补一个让主角当场赢回主动权的小反转')
  })

  test('carries platform rubric execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 208,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:30.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                rubric: 'fanqie',
                platform_checks: [
                  {
                    key: 'opening_hook',
                    label: '前三段钩子',
                    status: 'warn',
                    opening_pace: '前三段先给对手撕毁证据的现场事件。',
                    payoff_density: '每场至少有一次主角反击或信息收益。',
                    reader_expectation: '读者期待主角用超人听力反制广播。',
                    page_turn_pull: '章尾把广播来源推到墙内水声。',
                    evidence: '前三段仍在解释宿舍规则。',
                    fix: '下一章必须先开事件再补规则。',
                    remaining_risk: '不能继续用平台说明替代现场冲突。',
                  },
                  {
                    key: 'paragraph_spacing',
                    label: '段落留白',
                    status: 'pass',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修平台适配')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('平台适配：平台缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('platform_checks.前三段钩子')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('key=opening_hook')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('platform=fanqie')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('opening_pace=前三段先给对手撕毁证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('payoff_density=每场至少有一次主角反击')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_expectation=读者期待主角用超人听力反制广播')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('page_turn_pull=章尾把广播来源推到墙内水声')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('段落留白')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('opening_pace')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('payoff_density')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('page_turn_pull')
    expect(prompt).toContain('platform_checks.前三段钩子')
    expect(prompt).toContain('不能继续用平台说明替代现场冲突')
  })

  test('carries failed content rubric checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 208,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                content_rubric_checks: [
                  {
                    key: 'plot_loop',
                    label: '最小剧情循环',
                    status: 'fail',
                    evidence: '主角一直解释规则，没有目标、行动和反馈闭环。',
                    fix: '下一章开篇给主角一个必须立刻验证水迹名字的目标，并写出失败代价。',
                  },
                  {
                    key: 'core_payoff',
                    label: '核心卖点',
                    status: 'warn',
                    evidence: '超人能力没有和规则怪谈形成反差回报。',
                    fix: '下一章用超人听力发现门外水声来自墙内，形成规则反差。',
                  },
                  {
                    key: 'format_readability',
                    label: '格式可读性',
                    status: 'pass',
                    evidence: '对话独立成段。',
                    fix: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修内容基准')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('内容基准：基准缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('必须立刻验证水迹名字')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('超人听力发现门外水声来自墙内')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对话独立成段')
    expect(prompt).toContain('内容基准：基准缺口 2')
    expect(prompt).toContain('主角一直解释规则')
    expect(prompt).toContain('规则反差')
  })

  test('carries content rubric execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 209,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                content_rubric_checks: [
                  {
                    label: '黄金三问缺口',
                    status: 'warn',
                    core_selling_point: '超人能力被规则限制后反制广播。',
                    conflict_progression: '从救不救门外学生推进到追查广播来源。',
                    chapter_change: '主角确认门外学生不是诱饵，而是被广播冒名。',
                    page_turn_reason: '广播为什么提前知道主角名字。',
                    evidence: '本章只解释宿舍规则，没有把广播来源变成下一章问题。',
                    fix: '下一章必须让水迹名字触发广播来源追查。',
                    remaining_risk: '不要停在规则说明，要给读者一个翻页问题。',
                  },
                  {
                    label: '文字自然度',
                    status: 'pass',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修内容基准')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('内容基准：基准缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('content_rubric_checks.黄金三问缺口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('core_selling_point=超人能力被规则限制后反制广播')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('conflict_progression=从救不救门外学生推进到追查广播来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_change=主角确认门外学生不是诱饵')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('page_turn_reason=广播为什么提前知道主角名字')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('文字自然度')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('core_selling_point')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('conflict_progression')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('page_turn_reason')
    expect(prompt).toContain('content_rubric_checks.黄金三问缺口')
    expect(prompt).toContain('不要停在规则说明')
  })

  test('carries failed quality specialty checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 209,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:30.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                structure_checks: [
                  {
                    key: 'opening_hook',
                    label: 'structure_checks 开篇钩子',
                    status: 'fail',
                    opening_hook: '前三段都在复述宿舍规则。',
                    evidence: '开头没有水迹名字触发目标。',
                    fix: '下一章第一幕让水迹名字直接出现在失踪名单背面。',
                  },
                  {
                    key: 'ending_page_turn',
                    label: 'structure_checks 章尾翻页',
                    status: 'pass',
                    evidence: '章尾露出第二个名字。',
                    fix: '',
                  },
                ],
                progression_checks: [
                  {
                    key: 'non_deletable_change',
                    label: 'progression_checks 不可删除变化',
                    status: 'warn',
                    non_deletable_change: '删掉本章仍能接下一章。',
                    evidence: '主角只讨论规则，没有让关系或主线状态变化。',
                    fix: '下一章中段必须让主角用半张名单逼室友交出门卡。',
                  },
                ],
                information_checks: [
                  {
                    key: 'new_concept_count',
                    label: 'information_checks 信息负载',
                    status: 'missing',
                    new_concept_count: 5,
                    evidence: '一次性塞入水迹、旧门、门卡、名单和黑章五个概念。',
                    fix: '下一章只保留水迹名字和门卡两个信息点，其余用动作延后。',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修质量专项')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量专项：结构推进信息缺口 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('失踪名单背面')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半张名单逼室友交出门卡')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('只保留水迹名字和门卡两个信息点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('章尾露出第二个名字')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('质量专项开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('opening_hook')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('non_deletable_change')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_concept_count')
    expect(prompt).toContain('质量专项：结构推进信息缺口 3')
    expect(prompt).toContain('开头没有水迹名字触发目标')
    expect(prompt).toContain('一次性塞入水迹、旧门、门卡、名单和黑章五个概念')
  })

  test('carries prose review revision receipt checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 210,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                revision_receipt_checks: [
                  {
                    key: 'missing_changed_evidence',
                    label: '修订回执检查',
                    status: 'fail',
                    required_action: '下一章必须重做破局过程，用现场动作证明门卡权限真的改变。',
                    repair_segment: 'middle',
                    applied_fix: '上一章声称已补破局过程。',
                    changed_evidence: '已修复。',
                    fix: '中段让主角当场折断旧门卡，再用半印血线换到半格权限。',
                    remaining_risk: '修订回执仍缺可定位动作，不能只写“危机解决”。',
                  },
                  {
                    key: 'revision_receipt_ok',
                    label: '修订回执已同步',
                    status: 'pass',
                    required_action: '已逐条同步修订回执。',
                    changed_evidence: '门卡权限已落到正文。',
                    remaining_risk: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先复核修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修订回执检查：检查缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('revision_receipt_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('重做破局过程')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半印血线换到半格权限')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('已逐条同步修订回执')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('修订回执检查开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('repair_segment=middle')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('changed_evidence')
    expect(prompt).toContain('修订回执检查：检查缺口 1')
    expect(prompt).toContain('repair_segment=middle')
    expect(prompt).toContain('修订回执仍缺可定位动作')
  })

  test('carries prose review deslop repair checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 211,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:11:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                deslop_repair_checks: [
                  {
                    gate: 'F',
                    label: '章末总结体',
                    status: 'warn',
                    original_risk: '上一章章末仍用“这一切才刚刚开始”的抽象总结。',
                    rewritten_evidence: '水迹在玻璃上停住。',
                    changed_evidence: '已经去AI味。',
                    receipt_synced: false,
                    fix: '下一章开篇用水迹倒流、门卡发烫和一句短对白承接，不写抽象总结。',
                    remaining_risk: '去AI味回执没有同步 changed_evidence，Gate F 总结体可能复现。',
                  },
                  {
                    gate: 'B',
                    label: '解释腔',
                    status: 'pass',
                    changed_evidence: '对话已经替代解释。',
                    fix: '无需继续修复。',
                    remaining_risk: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先去AI味')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('去AI味检查：闭环缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('deslop_repair_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('Gate F')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('水迹倒流、门卡发烫和一句短对白')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('无需继续修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('去AI味检查开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('rewritten_evidence')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('receipt_synced=false')
    expect(prompt).toContain('去AI味检查：闭环缺口 1')
    expect(prompt).toContain('receipt_synced=false')
    expect(prompt).toContain('Gate F 总结体可能复现')
  })

  test('carries adversarial perspective verdicts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 209,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                perspective_verdicts: [
                  {
                    reviewer: 'story-architect',
                    verdict: 'CONCERNS',
                    summary: '结构钩子弱，章末没有把水迹名字转成下一章目标。',
                    recommendations: ['下一章开篇让主角把水迹名字和失踪名单对上。'],
                  },
                  {
                    reviewer: 'consistency-checker',
                    verdict: 'REJECT',
                    findings: [
                      {
                        severity: 'S1',
                        category: 'consistency',
                        evidence: '前文规则说不能触碰门外水迹，本章却直接用手擦掉。',
                        fix: '下一章必须统一为不能直接触碰水迹，并补一个隔物验证动作。',
                      },
                    ],
                  },
                  {
                    reviewer: 'narrative-writer',
                    verdict: 'APPROVE',
                    summary: '文字自然度可接受。',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先处理多视角审查')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('多视角审查：视角风险 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('失踪名单对上')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('隔物验证动作')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('文字自然度可接受')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('多视角审查开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('失踪名单对上')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('隔物验证动作')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('多视角审查章尾修复')
    expect(prompt).toContain('多视角审查：视角风险 2')
    expect(prompt).toContain('不能直接触碰水迹')
    expect(prompt).toContain('结构钩子弱')
  })

  test('carries failed deslop gate checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 210,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:11:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                deslop_level: '中度',
                deslop_checks: [
                  {
                    gate: 'B',
                    pattern: '否定铺垫后接肯定翻转',
                    status: 'fail',
                    evidence: '那不是普通水迹，而是一种更深的规则。',
                    fix: '下一章删掉否定铺垫，直接写水迹在墙内倒流的可见现象。',
                  },
                  {
                    gate: 'G',
                    pattern: '解释腔/上帝视角/安排感',
                    status: 'warn',
                    evidence: '他不知道的是，更大的风暴已经开始。',
                    fix: '下一章用门外水声和名单缺页制造悬念，不写作者预告。',
                  },
                  {
                    gate: 'E',
                    pattern: '对话标签',
                    status: 'pass',
                    evidence: '对话用动作承接。',
                    fix: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先去AI味')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('去AI味：门禁缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('水迹在墙内倒流')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外水声和名单缺页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对话用动作承接')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('去AI味门禁开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('水迹在墙内倒流')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('Gate G')
    expect(prompt).toContain('去AI味：门禁缺口 2')
    expect(prompt).toContain('那不是普通水迹')
    expect(prompt).toContain('更大的风暴已经开始')
  })

  test('carries deslop gate diagnostics summary into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 211,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                deslop_gate_diagnostics: {
                  version: 'oh_story_deslop_gate_diagnostics_v1',
                  summary: '去AI味门禁 2/7 项需处理，优先修复 fail，其次修复 warn。',
                  total: 3,
                  concern_gate_count: 2,
                  gates: [
                    {
                      gate: 'A',
                      label: '禁用词/模板表达',
                      status: 'fail',
                      count: 2,
                      patterns: ['不是A，而是B', '一丝'],
                      evidence: '那不是普通水迹，而是一种更深的规则。',
                      fix: '下一章直接写水迹倒流，不要再用不是A而是B。',
                    },
                    {
                      gate: 'E',
                      label: '对话腔调',
                      status: 'warn',
                      count: 1,
                      patterns: ['对话腔调模板化'],
                      evidence: '你要明白，这件事没那么简单。',
                      fix: '下一章让管理员用逼问和遮掩推进信息。',
                    },
                    { gate: 'G', label: '解释腔/上帝视角/安排感', status: 'pass', count: 0 },
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先去AI味')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('去AI味：门禁摘要 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('去AI味门禁 2/7')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('水迹倒流')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('逼问和遮掩')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('去AI味门禁开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('Gate A')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('Gate E')
    expect(prompt).toContain('去AI味：门禁摘要 2')
    expect(prompt).toContain('Gate A 禁用词/模板表达')
    expect(prompt).toContain('Gate E 对话腔调')
  })

  test('carries failed dialogue checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 211,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                dialogue_checks: [
                  {
                    key: 'voice_distinction',
                    label: '角色声线差异',
                    status: 'fail',
                    evidence: '李超、张智、门外学生都在用同一种解释规则的口吻。',
                    fix: '下一章让李超用短句顶回去，张智只拆规则漏洞，门外学生只重复一句求救。',
                  },
                  {
                    key: 'subtext_agenda',
                    label: '潜台词与议程',
                    status: 'warn',
                    evidence: '角色把真实目的直接说出来，没有借口和试探。',
                    fix: '下一章把“我想进门”改成门外学生借丢失校牌试探开门规则。',
                  },
                  {
                    key: 'dialogue_format',
                    label: '对话独立成行',
                    status: 'pass',
                    evidence: '对白格式清楚。',
                    fix: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修对白')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修对白：对白缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李超用短句顶回去')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('丢失校牌试探开门规则')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对白格式清楚')
    expect(prompt).toContain('修对白：对白缺口 2')
    expect(prompt).toContain('同一种解释规则的口吻')
    expect(prompt).toContain('真实目的直接说出来')
  })

  test('carries failed plot dynamics checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 212,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                plot_dynamics_checks: [
                  {
                    key: 'minimum_loop',
                    label: '目标阻碍反馈闭环',
                    status: 'fail',
                    evidence: '主角只是解释规则，没有行动、代价或新期待。',
                    fix: '下一章开篇让主角立刻验证水迹名字，并付出被宿管发现的代价。',
                  },
                  {
                    key: 'false_victory_collapse',
                    label: '假胜与崩解',
                    status: 'warn',
                    evidence: '主角发现线索后直接顺利推进，没有先给希望再击碎。',
                    fix: '下一章让水迹名字先指向安全答案，再被失踪名单推翻。',
                  },
                  {
                    key: 'ending_suspension',
                    label: '悬置收尾',
                    status: 'pass',
                    evidence: '章末留下水迹名字。',
                    fix: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修剧情动力')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修剧情动力：动力缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('被宿管发现的代价')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('失踪名单推翻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('章末留下水迹名字')
    expect(prompt).toContain('修剧情动力：动力缺口 2')
    expect(prompt).toContain('没有行动、代价或新期待')
    expect(prompt).toContain('先给希望再击碎')
  })

  test('carries failed continuity heat checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '旧钥匙缺口' },
      [
        { id: 4, chapter_no: 4, title: '水迹名字' },
        { id: 5, chapter_no: 5, title: '旧钥匙缺口' },
      ],
      [
        {
          id: 213,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                continuity_heat_checks: [
                  {
                    key: 'cold_foreshadowing',
                    label: '冷伏笔突然回收',
                    status: 'fail',
                    evidence: '旧钥匙三章未出现，章末突然成为破局答案。',
                    fix: '下一章先让角色发现钥匙缺口和旧锁痕，再推向回收。',
                  },
                  {
                    key: 'hot_element',
                    label: '当前 hot 元素',
                    status: 'warn',
                    evidence: '湿漉漉学生线索被搁置，改写无关宿舍闲聊。',
                    fix: '下一章开篇必须用湿漉漉学生继续施压。',
                  },
                  {
                    key: 'archived',
                    label: '已完结线',
                    status: 'pass',
                    evidence: '宿管查房线已自然关闭。',
                    fix: '',
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
        chapter_no: 5,
        title: '旧钥匙缺口',
        summary: '主角回收旧钥匙线索，确认它和宿舍门锁规则有关。',
        conflict: '湿漉漉学生再次施压，但室友想隐藏旧钥匙。',
        ending_hook: '旧锁痕里卡着三年前的学生证。',
        scene_cards: [
          { scene_no: 1, title: '钥匙缺口', reader_payoff: '旧钥匙从冷伏笔重新升温。' },
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
      { chapter_no: 5, title: '旧钥匙缺口' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修连续性热度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('连续性热度：热度缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('钥匙缺口和旧锁痕')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('湿漉漉学生继续施压')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('宿管查房线已自然关闭')
    expect(prompt).toContain('连续性热度：热度缺口 2')
    expect(prompt).toContain('旧钥匙三章未出现')
    expect(prompt).toContain('无关宿舍闲聊')
  })

  test('carries failed character relation checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 6, chapter_no: 6, title: '公开作证' },
      [
        { id: 5, chapter_no: 5, title: '旧钥匙缺口' },
        { id: 6, chapter_no: 6, title: '公开作证' },
      ],
      [
        {
          id: 214,
          chapter_id: 5,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 5,
            chapter_no: 5,
            self_check: {
              review: {
                character_relation_checks: [
                  {
                    key: 'independent_goal',
                    label: '主角目标独立性',
                    status: 'fail',
                    evidence: '李玄整章只是在帮林青禾找证据，没有自己的试炼资格诉求。',
                    fix: '下一章开篇必须让李玄明确为了保住试炼资格主动要求复核阵图。',
                  },
                  {
                    key: 'npc_support',
                    label: '配角站桩',
                    status: 'warn',
                    evidence: '林青禾只在主角需要时作证，没有自己的顾虑和行动。',
                    fix: '下一章让林青禾先拒绝，再因家族风险选择有限作证。',
                  },
                  {
                    key: 'relationship_type',
                    label: '关系类型明确',
                    status: 'pass',
                    evidence: '执事权威压迫成立。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 6,
        title: '公开作证',
        summary: '李玄要求复核阵图，林青禾在家族风险和事实之间做选择。',
        conflict: '林青禾作证会得罪执事，但沉默会让李玄失去试炼资格。',
        ending_hook: '林青禾作证后，阵盘裂出第二道光。',
        scene_cards: [
          { scene_no: 1, title: '复核阵图', reader_payoff: '李玄主动争取试炼资格。' },
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
      { chapter_no: 6, title: '公开作证' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修角色关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('角色关系：关系缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('保住试炼资格')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('执事权威压迫成立')
    expect(prompt).toContain('角色关系：关系缺口 2')
    expect(prompt).toContain('没有自己的试炼资格诉求')
    expect(prompt).toContain('配角站桩')
  })

  test('carries failed benchmark recall checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '旧印章反推' },
      [
        { id: 6, chapter_no: 6, title: '公开作证' },
        { id: 7, chapter_no: 7, title: '旧印章反推' },
      ],
      [
        {
          id: 215,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference_missing',
                    label: '节奏参照失效',
                    status: 'fail',
                    evidence: '正文直接亮出旧印章，没有执行“先压三轮质问，再用证据爆发”。',
                    fix: '下一章开篇先让执事连续压问三轮，再让李玄晚半拍亮出旧印章反证。',
                  },
                  {
                    key: 'matched_technique_missing',
                    label: '匹配章技法缺席',
                    status: 'warn',
                    evidence: '旁观弟子反应只有整齐震惊，没有差异化反应。',
                    fix: '下一章让旁观弟子分成怀疑、倒戈、沉默三种反应，放大信息差反杀。',
                  },
                  {
                    key: 'copy_guard',
                    label: '未复制原文',
                    status: 'pass',
                    evidence: '没有发现对标章节原句。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '旧印章反推',
        summary: '李玄用旧印章反推出执事换证，逼旁观弟子重新站队。',
        conflict: '执事连续压问，试图抢走证词解释权。',
        ending_hook: '旧印章背面刻着第二个证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '三轮压问', reader_payoff: '信息差反杀，执事失态。' },
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
      { chapter_no: 7, title: '旧印章反推' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风召回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风召回：召回缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('连续压问三轮')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('怀疑、倒戈、沉默三种反应')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('没有发现对标章节原句')
    expect(prompt).toContain('文风召回：召回缺口 2')
    expect(prompt).toContain('没有执行“先压三轮质问，再用证据爆发”')
    expect(prompt).toContain('差异化反应')
  })

  test('carries benchmark recall execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '旧印反问' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '旧印反问' },
      ],
      [
        {
          id: 218,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:18:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference_missing',
                    label: '节奏参照失效',
                    status: 'fail',
                    source_type: 'rhythm',
                    source_path: '剧情/节奏.md',
                    expected_application: '先让执事三轮压问，再让李玄半拍亮出旧印证据。',
                    delivered_evidence: '正文开场直接交出旧印，缺少压问、停顿和半拍爆发。',
                    gaps_preserved: false,
                    evidence: '节奏参照没有落到正文动作。',
                    fix: '下一章开篇按三轮压问建立压迫，中段用半拍亮证据爆发。',
                    remaining_risk: '不能继续把对标节奏写成一句总结。',
                  },
                  {
                    key: 'style_boundary_ok',
                    label: '未复制桥段',
                    status: 'pass',
                    source_type: 'matched_chapter',
                    source_path: '对标/第12章.md',
                    expected_application: '只学习停顿节奏。',
                    delivered_evidence: '已兑现。',
                    gaps_preserved: true,
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '旧印反问',
        summary: '李玄用旧印反问执事，逼出旧证缺口。',
        conflict: '执事试图用连续压问夺回解释权。',
        ending_hook: '旧印缺口指向第三个证人。',
        scene_cards: [
          { scene_no: 1, title: '三轮压问', reader_payoff: '文风召回字段被正文执行。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:18:00.000Z',
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
      { chapter_no: 8, title: '旧印反问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风召回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风召回：召回缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('benchmark_recall_checks.节奏参照失效')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_type=rhythm')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_path=剧情/节奏.md')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expected_application=先让执事三轮压问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('delivered_evidence=正文开场直接交出旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('gaps_preserved=false')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('未复制桥段')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('文风召回')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('expected_application')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('gaps_preserved')
    expect(prompt).toContain('benchmark_recall_checks.节奏参照失效')
    expect(prompt).toContain('不能继续把对标节奏写成一句总结')
  })

  test('carries failed style boundary checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '旧印章反推' },
      [
        { id: 6, chapter_no: 6, title: '公开作证' },
        { id: 7, chapter_no: 7, title: '旧印章反推' },
      ],
      [
        {
          id: 216,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                style_boundary_checks: [
                  {
                    key: 'gate_f_overridden_by_style',
                    label: '文风覆盖 Gate F',
                    status: 'fail',
                    evidence: '章尾为了模仿样章冷感，写成“这一切只是开始”的作者预告。',
                    fix: '下一章删掉为了模仿文风引入的章末升华，用旧印章背面的第二个名字做现场钩子。',
                  },
                  {
                    key: 'copy_boundary_breach',
                    label: '复制样章桥段',
                    status: 'warn',
                    evidence: '审判场景复用了样章的三次敲桌和同一句口癖。',
                    fix: '下一章保留压迫节奏，但改成证物裂纹、旁观倒戈和执事抢证，不复制样章桥段。',
                  },
                  {
                    key: 'hard_constraints_pass',
                    label: '硬约束通过',
                    status: 'pass',
                    evidence: '未发现禁用词。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '旧印章反推',
        summary: '李玄用旧印章反推出执事换证，逼旁观弟子重新站队。',
        conflict: '执事连续压问，试图抢走证词解释权。',
        ending_hook: '旧印章背面刻着第二个证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '旧印章反推', reader_payoff: '信息差反杀，执事失态。' },
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
      { chapter_no: 7, title: '旧印章反推' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风边界')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风边界：边界缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('章末升华')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不复制样章桥段')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('未发现禁用词')
    expect(prompt).toContain('文风边界：边界缺口 2')
    expect(prompt).toContain('模仿样章冷感')
    expect(prompt).toContain('复制样章桥段')
  })

  test('carries style boundary execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '旧印反问' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '旧印反问' },
      ],
      [
        {
          id: 219,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:19:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                style_boundary_checks: [
                  {
                    key: 'secondary_benchmark_voice_leak',
                    label: '副对标口吻污染',
                    status: 'fail',
                    reference_risk: '为了学习副对标冷讽口吻，把李玄写成旁观式嘲弄。',
                    rewritten_with_local_action: '改成李玄按住旧印裂纹、逼执事当场回应，讽刺只保留在动作结果里。',
                    voice_anchor: '李玄克制、短句、先证据后反问。',
                    copied_phrase_removed: false,
                    evidence: '正文用了副对标原句“你也配看见门后”。',
                    fix: '下一章删掉副对标原句，把冷讽改成本书旧印动作和证据后果。',
                    remaining_risk: '不能让副对标口吻覆盖本书角色声音。',
                  },
                  {
                    key: 'hard_constraints_ok',
                    label: '硬约束通过',
                    status: 'pass',
                    reference_risk: '已兑现。',
                    rewritten_with_local_action: '已兑现。',
                    voice_anchor: '已兑现。',
                    copied_phrase_removed: true,
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '旧印反问',
        summary: '李玄用旧印反问执事，逼出旧证缺口。',
        conflict: '执事试图用连续压问夺回解释权。',
        ending_hook: '旧印缺口指向第三个证人。',
        scene_cards: [
          { scene_no: 1, title: '旧印反问', reader_payoff: '文风边界字段被正文执行。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:19:00.000Z',
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
      { chapter_no: 8, title: '旧印反问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风边界')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风边界：边界缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('style_boundary_checks.副对标口吻污染')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reference_risk=为了学习副对标冷讽口吻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('rewritten_with_local_action=改成李玄按住旧印裂纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('voice_anchor=李玄克制、短句、先证据后反问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('copied_phrase_removed=false')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('硬约束通过')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('文风边界')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('rewritten_with_local_action')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('copied_phrase_removed')
    expect(prompt).toContain('style_boundary_checks.副对标口吻污染')
    expect(prompt).toContain('不能让副对标口吻覆盖本书角色声音')
  })

  test('carries failed style sample checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '旧印章反推' },
      [
        { id: 6, chapter_no: 6, title: '公开作证' },
        { id: 7, chapter_no: 7, title: '旧印章反推' },
      ],
      [
        {
          id: 218,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:15:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                style_sample_checks: [
                  {
                    key: 'applicable_scene_mismatch',
                    label: '样章适用场景错配',
                    status: 'fail',
                    evidence: '本章是高压审讯，却套用了低压背景说明样章，导致三轮压问和半拍亮证据没有落地。',
                    fix: '下一章改用审讯样章的三轮压问、半拍亮证据和短冷却，但只学习节奏，不复制桥段。',
                  },
                  {
                    key: 'copy_boundary_breach',
                    label: '样章复制边界越界',
                    status: 'warn',
                    evidence: '正文直接复用了样章“雨巷三次敲桌”的桥段。',
                    fix: '下一章把敲桌改成旧印章裂纹、证人退后和执事抢证，保留压迫节奏但换成本书资产动作。',
                  },
                  {
                    key: 'dialogue_ratio_ok',
                    label: '对白比例通过',
                    status: 'pass',
                    evidence: '对白比例接近 40%。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '旧印章反推',
        summary: '李玄用旧印章反推出执事换证，逼旁观弟子重新站队。',
        conflict: '执事连续压问，试图抢走证词解释权。',
        ending_hook: '旧印章背面刻着第二个证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '旧印章反推', reader_payoff: '样章策略缺口被正文补上。' },
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
      { chapter_no: 7, title: '旧印章反推' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修样章策略')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('样章策略：策略缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('三轮压问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章裂纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对白比例接近 40%')
    expect(prompt).toContain('样章策略：策略缺口 2')
    expect(prompt).toContain('高压审讯')
    expect(prompt).toContain('复制边界')
  })

  test('carries style sample execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '旧印反问' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '旧印反问' },
      ],
      [
        {
          id: 220,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:21:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                style_sample_checks: [
                  {
                    key: 'sample_technique_not_adapted',
                    label: '样章技法未本土化',
                    status: 'fail',
                    style_dimension: '审讯节奏',
                    source_technique: '三轮压问后半拍亮证据',
                    adapted_evidence: '正文只复述样章敲桌桥段，没有改成旧印裂纹和证人退后。',
                    copied_phrase_rewritten: false,
                    evidence: '样章策略停在模仿桥段，没有落成本书资产动作。',
                    fix: '下一章把三轮压问改成执事抢证、旧印裂纹、证人退后，再半拍亮出旧印反问。',
                    remaining_risk: '不能继续照搬样章敲桌桥段和原句。',
                  },
                  {
                    key: 'sample_ratio_ok',
                    label: '样章节奏通过',
                    status: 'pass',
                    style_dimension: '对白比例',
                    source_technique: '短句推进',
                    adapted_evidence: '已兑现。',
                    copied_phrase_rewritten: true,
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '旧印反问',
        summary: '李玄用旧印反问执事，逼出旧证缺口。',
        conflict: '执事试图用连续压问夺回解释权。',
        ending_hook: '旧印缺口指向第三个证人。',
        scene_cards: [
          { scene_no: 1, title: '旧印反问', reader_payoff: '样章策略字段被正文执行。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:21:00.000Z',
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
      { chapter_no: 8, title: '旧印反问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修样章策略')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('样章策略：策略缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('style_sample_checks.样章技法未本土化')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('style_dimension=审讯节奏')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_technique=三轮压问后半拍亮证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('adapted_evidence=正文只复述样章敲桌桥段')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('copied_phrase_rewritten=false')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('样章节奏通过')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('样章策略')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('adapted_evidence')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('copied_phrase_rewritten')
    expect(prompt).toContain('style_sample_checks.样章技法未本土化')
    expect(prompt).toContain('不能继续照搬样章敲桌桥段和原句')
  })

  test('carries benchmark recall sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '第二个证人' },
      ],
      [
        {
          id: 216,
          chapter_id: 7,
          review_type: 'benchmark_recall_sync',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            benchmark_recall_sync: {
              status: 'warn',
              label: '召回缺口 2',
              summary: '正文有 2 项文风召回要求未充分落地。',
              missed_count: 2,
              missed: [
                { label: '节奏参照', text: '先压三轮质问，再用证据爆发' },
                { label: '匹配章技法', text: '旁观者差异化反应' },
              ],
              next_actions: [
                '下一章必须补足文风召回 missed 项，把节奏参照和匹配章技法写成正文可见的压迫、爆发、冷却或反应。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '第二个证人',
        summary: '李玄顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事试图抢先灭口，旁观弟子开始分裂站队。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '文风召回缺口被正文补上。' },
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
      { chapter_no: 8, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补召回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补召回：召回缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先压三轮质问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旁观者差异化反应')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('先压三轮质问')
    expect(prompt).toContain('补召回：召回缺口 2')
    expect(prompt).toContain('旁观者差异化反应')
  })

  test('carries copied benchmark anchor excerpt risk into staged next-chapter repair actions', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '第二个证人' },
      ],
      [
        {
          id: 217,
          chapter_id: 7,
          review_type: 'benchmark_recall_sync',
          created_at: '2026-06-09T08:16:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            benchmark_recall_sync: {
              status: 'warn',
              label: '召回缺口 1',
              summary: '正文复制了原文锚点片段。',
              missed_count: 1,
              missed: [
                {
                  key: 'benchmark_anchor_excerpt_copy_risk',
                  label: '原文锚点复制风险',
                  text: 'anchor_excerpts 第1段出现可定位原句复制：账册翻到缺页前一行',
                  evidence: '账册翻到缺页前一行',
                  fix: '删除或改写锚点原句；只保留句长、停顿、潜台词和信息释放手法。',
                },
              ],
              copied_anchor_excerpts: ['账册翻到缺页前一行'],
              next_actions: [
                '存在原文锚点复制风险：删除或改写锚点原句，只保留句长、停顿、潜台词和信息释放手法。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '第二个证人',
        summary: '李玄顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事试图抢先灭口，旁观弟子开始分裂站队。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '清理锚点复制后继续执行召回技法。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:02:00.000Z',
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
      { chapter_no: 8, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补召回')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('benchmark_anchor_excerpt_copy_risk')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('删除或改写锚点原句')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('锚点原句')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('信息释放手法')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('锚点复制')
    expect(prompt).toContain('删除或改写锚点原句')
    expect(prompt).toContain('只保留句长、停顿、潜台词和信息释放手法')
  })

  test('carries style boundary sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '第二个证人' },
      ],
      [
        {
          id: 217,
          chapter_id: 7,
          review_type: 'style_boundary_sync',
          created_at: '2026-06-09T08:16:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            style_boundary_sync: {
              status: 'warn',
              label: '文风边界缺口 2',
              summary: '正文有 2 项文风覆盖边界风险。',
              missed_count: 2,
              missed: [
                { label: 'Gate F 章末升华', text: '这一切只是开始' },
                { label: '样章复制风险', text: '三次敲桌和同一句口癖' },
              ],
              next_actions: [
                '下一章必须恢复硬约束永远赢：删章末升华、作者预告和样章复制，只保留抽象节奏。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '第二个证人',
        summary: '李玄顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事试图抢先灭口，旁观弟子开始分裂站队。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '文风边界缺口被正文补上。' },
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
      { chapter_no: 8, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风边界')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补文风边界：文风边界缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('删章末升华')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('三次敲桌')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('同步风险开篇承接')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('style_boundary_sync')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('同步风险中段兑现')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('同步风险章尾复核')
    expect(prompt).toContain('补文风边界：文风边界缺口 2')
    expect(prompt).toContain('硬约束永远赢')
  })

  test('carries story loop sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 218,
          chapter_id: 8,
          review_type: 'story_loop_sync',
          created_at: '2026-06-09T08:18:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            story_loop_sync: {
              status: 'warn',
              label: '故事循环缺口 2',
              summary: '正文有 2 项故事循环缺口。',
              missed_count: 2,
              missed: [
                { label: '兑现反馈', text: '沈砚用旧印章反证账册被调换' },
                { label: '承接期待', text: '旧印章背面露出第二个证人的名字' },
              ],
              next_actions: [
                '下一章必须补足 setup -> escalation -> payoff -> carry_over，把上一章缺失的兑现反馈和承接期待写成现场后果。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图切断旧账反证的后果。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '故事循环缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补故事循环')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补循环：故事循环缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('setup -> escalation -> payoff -> carry_over')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('旧印章背面露出第二个证人的名字')
    expect(prompt).toContain('补循环：故事循环缺口 2')
    expect(prompt).toContain('承接期待')
  })

  test('carries information flow sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 219,
          chapter_id: 8,
          review_type: 'information_flow_sync',
          created_at: '2026-06-09T08:19:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            information_flow_sync: {
              status: 'warn',
              label: '信息流缺口 2',
              summary: '正文有 2 项信息流缺口。',
              missed_count: 2,
              missed: [
                { label: '揭示顺序', text: '先让执事压旧账册 -> 再让证人改口 -> 最后亮旧印章' },
                { label: '背景说明书', text: '信息必须随审问冲突释放，不写背景说明书' },
              ],
              next_actions: [
                '下一章必须补足信息流：信息随冲突释放，按揭示顺序递进，删背景说明书。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图切断旧账反证的信息后果。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '信息流缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补信息流')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补信息流：信息流缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('信息随冲突释放')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('背景说明书')
    expect(prompt).toContain('补信息流：信息流缺口 2')
    expect(prompt).toContain('揭示顺序')
  })

  test('carries beat cooling sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 16, chapter_no: 16, title: '账册余波' },
      [
        { id: 15, chapter_no: 15, title: '第三次会审压迫' },
        { id: 16, chapter_no: 16, title: '账册余波' },
      ],
      [
        {
          id: 231,
          chapter_id: 15,
          review_type: 'beat_cooling_sync',
          created_at: '2026-06-09T08:22:00.000Z',
          payload: JSON.stringify({
            chapter_id: 15,
            chapter_no: 15,
            beat_cooling_sync: {
              status: 'warn',
              label: '节奏冷却缺口 2',
              summary: '最近章节触发 2 项事件冷却风险。',
              missed_count: 2,
              missed: [
                { label: '大冲突冷却', text: 'conflict_thrill 最多连续 2 章。' },
                { label: '五章调剂', text: '每 5 章必须包含 bond_deepening 或 world_painting。' },
              ],
              next_actions: [
                '下一章优先轮换桥段类型：大冲突后补关系深化、世界观展开、势力建设或冲突余波。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 16,
        title: '账册余波',
        summary: '沈砚从第三次会审压迫后转入关系和旧城制度余波。',
        conflict: '林青禾担心他继续硬打会被长老席抓住破绽。',
        ending_hook: '旧城税契背面露出新地图入口。',
        scene_cards: [
          { scene_no: 1, title: '余波复盘', reader_payoff: '关系深化和世界观展开承接上一章大冲突。' },
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
      { chapter_no: 16, title: '账册余波' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先轮换桥段类型')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('换节奏：节奏冷却缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('关系深化')
    expect(prompt).toContain('换节奏：节奏冷却缺口 2')
    expect(prompt).toContain('优先轮换桥段类型')
  })

  test('carries expectation threshold sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 220,
          chapter_id: 8,
          review_type: 'expectation_threshold_sync',
          created_at: '2026-06-09T08:21:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            expectation_threshold_sync: {
              status: 'warn',
              label: '期待阈值缺口 2',
              summary: '正文有 2 项期待阈值缺口。',
              missed_count: 2,
              missed: [
                { label: '两长一短', text: '幕后长老为什么放任主角进入内层' },
                { label: '下一开环', text: '拿到资格前先露出第三个证人的名字' },
              ],
              next_actions: [
                '下一章必须补期待阈值：恢复两长一短，先立下一开环，再兑现旧期待。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让旧账反证停在当前胜利。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '期待阈值缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补期待阈值')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补期待阈值：期待阈值缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('两长一短')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('第三个证人的名字')
    expect(prompt).toContain('补期待阈值：期待阈值缺口 2')
    expect(prompt).toContain('下一开环')
  })

  test('carries emotional arc sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 221,
          chapter_id: 8,
          review_type: 'emotional_arc_sync',
          created_at: '2026-06-09T08:22:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            emotional_arc_sync: {
              status: 'warn',
              label: '情绪弧缺口 2',
              summary: '正文有 2 项情绪弧缺口。',
              missed_count: 2,
              missed: [
                { label: '调动释放', text: '只有旧账册压罪，没有旧印章反证释放' },
                { label: '下行情节安全感', text: '连续下压但缺少旧印章底牌或潜在解法' },
              ],
              next_actions: [
                '下一章必须补情绪弧：恢复平静 -> 调动 -> 释放 -> 爽，先给安全感，再兑现释放。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让上一章的情绪停在压迫里。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '情绪弧缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补情绪弧')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补情绪弧：情绪弧缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('旧印章底牌')
    expect(prompt).toContain('补情绪弧：情绪弧缺口 2')
    expect(prompt).toContain('下行情节安全感')
  })

  test('carries chapter hook quality execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 232,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                chapter_hook_quality_checks: [
                  {
                    key: 'ending_low_risk_hook',
                    label: '章尾低风险空钩子',
                    status: 'fail',
                    hook_position: 'ending',
                    trigger_type: '低风险口头预告',
                    concrete_question: '第三个证人究竟是谁。',
                    danger_or_choice: '第二个证人如果开口就会被执事当场封口。',
                    next_action_link: '下一章必须先保护第二个证人，再追第三个人。',
                    evidence: '章尾只写“事情还没完”，没有现场触发、危险选择或下一章行动压力。',
                    fix: '下一章最后300字必须把第三个证人的名字压到现场证物上，并让执事当场封口制造行动压力。',
                    remaining_risk: '不能再用低风险空话当章尾钩子。',
                  },
                  {
                    key: 'opening_hook_ok',
                    label: '章首现场异常',
                    status: 'pass',
                    hook_position: 'opening',
                    trigger_type: '现场异常',
                    concrete_question: '已兑现。',
                    danger_or_choice: '已兑现。',
                    next_action_link: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图切断旧账反证的后果。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '章钩质量缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:25:00.000Z',
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章级钩子')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章级钩子：钩子缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_hook_quality_checks.章尾低风险空钩子')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('hook_position=ending')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trigger_type=低风险口头预告')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('concrete_question=第三个证人究竟是谁')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('danger_or_choice=第二个证人如果开口就会被执事当场封口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('next_action_link=下一章必须先保护第二个证人')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('章首现场异常')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('章级钩子')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('danger_or_choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_action_link')
    expect(prompt).toContain('chapter_hook_quality_checks.章尾低风险空钩子')
    expect(prompt).toContain('不能再用低风险空话当章尾钩子')
  })

  test('carries chapter hook sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 222,
          chapter_id: 8,
          review_type: 'chapter_hook_sync',
          created_at: '2026-06-09T08:23:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            chapter_hook_sync: {
              status: 'warn',
              label: '章级钩子缺口 2',
              summary: '正文有 2 项章级钩子缺口。',
              missed_count: 2,
              missed: [
                { label: '章首钩子', text: '前100字没有执事逼交旧账册。' },
                { label: '章尾钩子', text: '章尾没有第三个证人的名字。' },
              ],
              next_actions: [
                '下一章必须补章级钩子：前100字先给冲突、异常或对话逼问，最后100字留下下一章必须处理的问题。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让上一章的章尾钩子断掉。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '章级钩子缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补章级钩子')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补章钩子：章级钩子缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('前100字')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('第三个证人的名字')
    expect(prompt).toContain('补章钩子：章级钩子缺口 2')
    expect(prompt).toContain('章尾钩子')
  })

  test('carries paragraph hook execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 233,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                paragraph_hook_checks: [
                  {
                    key: 'middle_paragraph_stall',
                    label: '中段段落停滞',
                    status: 'fail',
                    paragraph_range: '第4-7段',
                    hook_type: '信息差 + 暗牌',
                    micro_change: '每3段必须出现一次旧印裂纹、证人迟疑或执事抢证带来的新变化。',
                    information_or_risk_delta: '旧印裂纹暴露第三个证人还活着。',
                    emotion_or_relation_delta: '旁观弟子从整齐震惊分裂成怀疑、沉默和倒戈。',
                    evidence: '第4-7段连续解释旧账背景，没有信息、风险、情绪或关系变化。',
                    fix: '下一章中段每3-5段插入信息差或暗牌推进，用旧印裂纹和旁观分裂制造微变化。',
                    remaining_risk: '不能再让连续段落只停在解释旧账背景。',
                  },
                  {
                    key: 'dialogue_escalation_ok',
                    label: '对话递进',
                    status: 'pass',
                    paragraph_range: '第8-10段',
                    hook_type: '对话压迫',
                    micro_change: '已兑现。',
                    information_or_risk_delta: '已兑现。',
                    emotion_or_relation_delta: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让证人段落停在解释里。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '段落级钩子字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:26:00.000Z',
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修段落级钩子')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('段落级钩子：微钩子缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('paragraph_hook_checks.中段段落停滞')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('paragraph_range=第4-7段')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('hook_type=信息差 + 暗牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('micro_change=每3段必须出现一次旧印裂纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('information_or_risk_delta=旧印裂纹暴露第三个证人还活着')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotion_or_relation_delta=旁观弟子从整齐震惊分裂')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对话递进')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('段落级钩子')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('information_or_risk_delta')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('emotion_or_relation_delta')
    expect(prompt).toContain('paragraph_hook_checks.中段段落停滞')
    expect(prompt).toContain('不能再让连续段落只停在解释旧账背景')
  })

  test('carries paragraph hook sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 223,
          chapter_id: 8,
          review_type: 'paragraph_hook_sync',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            paragraph_hook_sync: {
              status: 'warn',
              label: '段落钩子缺口 2',
              summary: '正文有 2 项段落级钩子缺口。',
              missed_count: 2,
              missed: [
                { label: '段落停滞', text: '第2-5段缺少信息/风险/选择/异常推进。' },
                { label: '钩子组合', text: '暗牌 + 打脸没有形成段落内兑现。' },
              ],
              next_actions: [
                '下一章必须补段落级钩子：每 3-5 段出现信息、风险、情绪或关系变化。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让证人段落停在解释里。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '段落钩子缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补段落钩子')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补段钩子：段落钩子缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('每 3-5 段')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('第2-5段')
    expect(prompt).toContain('补段钩子：段落钩子缺口 2')
    expect(prompt).toContain('钩子组合')
  })

  test('carries suspense sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 224,
          chapter_id: 8,
          review_type: 'suspense_sync',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            suspense_sync: {
              status: 'warn',
              label: '悬念缺口 2',
              summary: '正文有 2 项悬念编排缺口。',
              missed_count: 2,
              missed: [
                { label: '信息顺序', text: '疑问、虚假提示和答案乱序。' },
                { label: '期待接力', text: '旧账册问题解决后没有第三个证人的新期待。' },
              ],
              next_actions: [
                '下一章必须补悬念编排：先提出疑问，再给可信提示或误导，最后公布答案并立起新期待。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让第三个证人的线索中断。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '悬念编排缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补悬念编排')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补悬念：悬念缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先提出疑问')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('第三个证人')
    expect(prompt).toContain('补悬念：悬念缺口 2')
    expect(prompt).toContain('期待接力')
  })

  test('carries reversal sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 225,
          chapter_id: 8,
          review_type: 'reversal_sync',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            reversal_sync: {
              status: 'warn',
              label: '反转缺口 2',
              summary: '正文有 2 项反转设计缺口。',
              missed_count: 2,
              missed: [
                { label: '铺垫暗示', text: '反转前没有3处公平暗示。' },
                { label: '揭示后影响', text: '执事身份揭示后没有改变审判局势。' },
              ],
              next_actions: [
                '下一章必须补反转设计：补足3处暗示、公平误导、揭示后影响和打脸节奏。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着上一章旧账册追出第二个证人。',
        conflict: '执事抢先封口，试图让反转影响中断。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '反转设计缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补反转设计')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补反转：反转缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('3处暗示')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('审判局势')
    expect(prompt).toContain('补反转：反转缺口 2')
    expect(prompt).toContain('公平误导')
  })

  test('carries showdown sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 10, chapter_no: 10, title: '阵台余波' },
      [
        { id: 9, chapter_no: 9, title: '阵盘亮底' },
        { id: 10, chapter_no: 10, title: '阵台余波' },
      ],
      [
        {
          id: 226,
          chapter_id: 9,
          review_type: 'showdown_sync',
          created_at: '2026-06-09T08:27:00.000Z',
          payload: JSON.stringify({
            chapter_id: 9,
            chapter_no: 9,
            showdown_sync: {
              status: 'warn',
              label: '高潮缺口 2',
              summary: '正文有 2 项高潮对抗缺口。',
              missed_count: 2,
              missed: [
                { label: '舞台层级', text: '群众层、中间层、核心层震惊没有传递链。' },
                { label: '爽点释放', text: '底牌释放后执事没有受到对应压制。' },
              ],
              next_actions: [
                '下一章必须补高潮对抗：补舞台层级、震惊分层、底牌压制和急-缓-急情绪节奏。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 10,
        title: '阵台余波',
        summary: '沈砚在阵台余波里接住上一章没写透的底牌影响。',
        conflict: '执事残党试图淡化失败，长老席要求沈砚复盘阵盘依据。',
        ending_hook: '核心层长老要求打开内库阵图。',
        scene_cards: [
          { scene_no: 1, title: '余波追认', reader_payoff: '高潮对抗缺口被正文补上。' },
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
      { chapter_no: 10, title: '阵台余波' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补高潮对抗')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补高潮：高潮缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('舞台层级')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('底牌释放')
    expect(prompt).toContain('补高潮：高潮缺口 2')
    expect(prompt).toContain('震惊分层')
  })

  test('carries bridge unit sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 16, chapter_no: 16, title: '投资人签字' },
      [
        { id: 15, chapter_no: 15, title: '旧城会审' },
        { id: 16, chapter_no: 16, title: '投资人签字' },
      ],
      [
        {
          id: 227,
          chapter_id: 15,
          review_type: 'bridge_unit_sync',
          created_at: '2026-06-09T08:28:00.000Z',
          payload: JSON.stringify({
            chapter_id: 15,
            chapter_no: 15,
            bridge_unit_sync: {
              status: 'warn',
              label: '桥段缺口 2',
              summary: '正文有 2 项桥段节奏缺口。',
              missed_count: 2,
              missed: [
                { label: '连续期待', text: '旧账本兑现后没有挂上新投资人目标。' },
                { label: '阶段衔接', text: '章尾没有说明下一步要争什么。' },
              ],
              next_actions: [
                '下一章必须补桥段节奏：补连续期待、章尾新目标、高潮中埋钩子和承接余波。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 16,
        title: '投资人签字',
        summary: '沈砚接住上一章会审后的新投资人目标。',
        conflict: '对手抢先截断签字流程，试图让旧城资金入口失效。',
        ending_hook: '投资人要求沈砚三日内拿出第二份旧城名单。',
        scene_cards: [
          { scene_no: 1, title: '签字前夜', reader_payoff: '桥段节奏缺口被正文补上。' },
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
      { chapter_no: 16, title: '投资人签字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补桥段节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补桥段：桥段缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('连续期待')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('新投资人目标')
    expect(prompt).toContain('补桥段：桥段缺口 2')
    expect(prompt).toContain('章尾新目标')
  })

  test('carries opening sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 2, chapter_no: 2, title: '第二位妈妈' },
      [
        { id: 1, chapter_no: 1, title: '门外有三个妈妈' },
        { id: 2, chapter_no: 2, title: '第二位妈妈' },
      ],
      [
        {
          id: 228,
          chapter_id: 1,
          review_type: 'opening_sync',
          created_at: '2026-06-09T08:29:00.000Z',
          payload: JSON.stringify({
            chapter_id: 1,
            chapter_no: 1,
            opening_sync: {
              status: 'warn',
              label: '开篇缺口 2',
              summary: '正文有 2 项开篇设计缺口。',
              missed_count: 2,
              missed: [
                { label: '爽点/期待点', text: '1000字内没有血缘系统或三位妈妈反常身份。' },
                { label: '三大基点', text: '金手指基点没有早段兑现。' },
              ],
              next_actions: [
                '下一章必须补开篇设计：前300字重拉主角现场，1000字内补期待点、金手指基点和本文卖点。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '规则妈妈们找上门', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 2,
        title: '第二位妈妈',
        summary: '李岚顺着第一章缺口补回血缘系统和第二位妈妈的反常身份。',
        conflict: '第二位妈妈要求李岚签字认亲，系统倒计时继续逼近。',
        ending_hook: '系统提示第二位妈妈的血缘匹配率仍然异常。',
        scene_cards: [
          { scene_no: 1, title: '倒计时续接', reader_payoff: '开篇设计缺口被正文补上。' },
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
      { chapter_no: 2, title: '第二位妈妈' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补开篇设计')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补开篇：开篇缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('1000字内')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('金手指基点')
    expect(prompt).toContain('补开篇：开篇缺口 2')
    expect(prompt).toContain('本文卖点')
  })

  test('carries prose craft sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 17, chapter_no: 17, title: '第二份旧名单' },
      [
        { id: 16, chapter_no: 16, title: '一块钱转账单' },
        { id: 17, chapter_no: 17, title: '第二份旧名单' },
      ],
      [
        {
          id: 229,
          chapter_id: 16,
          review_type: 'prose_craft_sync',
          created_at: '2026-06-09T08:35:00.000Z',
          payload: JSON.stringify({
            chapter_id: 16,
            chapter_no: 16,
            prose_craft_sync: {
              status: 'warn',
              label: '正文工艺缺口 2',
              summary: '正文有 2 项正文工艺缺口。',
              missed_count: 2,
              missed: [
                { label: '深度限知', text: '出现他不知道的是、所有人都没有发现等上帝视角。' },
                { label: '身体细节', text: '愤怒、委屈、悲伤没有落到手、呼吸、肩背或动作。' },
              ],
              next_actions: [
                '下一章必须补正文工艺：坚持深度限知，用身体细节替代抽象情绪，把道具/数字写成剧情功能。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 17,
        title: '第二份旧名单',
        summary: '沈砚用第二份旧名单接住上一章账本风向。',
        conflict: '对手转移账本原件，试图让转账单失效。',
        ending_hook: '第二份名单上出现沈砚旧疤对应的签收印。',
        scene_cards: [
          { scene_no: 1, title: '旧名单复核', reader_payoff: '正文工艺缺口被正文补上。' },
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
      { chapter_no: 17, title: '第二份旧名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补正文工艺')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补工艺：正文工艺缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('身体细节')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('深度限知')
    expect(prompt).toContain('补工艺：正文工艺缺口 2')
    expect(prompt).toContain('身体细节')
  })

  test('carries punctuation tone sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 18, chapter_no: 18, title: '印章追问' },
      [
        { id: 17, chapter_no: 17, title: '签收印' },
        { id: 18, chapter_no: 18, title: '印章追问' },
      ],
      [
        {
          id: 230,
          chapter_id: 17,
          review_type: 'punctuation_tone_sync',
          created_at: '2026-06-09T08:38:00.000Z',
          payload: JSON.stringify({
            chapter_id: 17,
            chapter_no: 17,
            punctuation_tone_sync: {
              status: 'warn',
              label: '语气标点缺口 2',
              summary: '正文有 2 项语气标点缺口。',
              missed_count: 2,
              missed: [
                { label: '禁用标点', text: '残留 …… 和 —— 硬造迟疑或打断。' },
                { label: '功能性问号', text: '签收印真假追问被压成陈述句，缺少人物声线。' },
              ],
              next_actions: [
                '下一章必须补语气标点：用动作停顿、换行或短句替代省略号/破折号，质问保留功能性问号。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 18,
        title: '印章追问',
        summary: '沈砚继续追问签收印对应的旧名单。',
        conflict: '对手试图把真假签收印变成无效争论。',
        ending_hook: '真正的印章编号指向另一个仓库。',
        scene_cards: [
          { scene_no: 1, title: '追问编号', reader_payoff: '语气标点缺口被正文补上。' },
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
      { chapter_no: 18, title: '印章追问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补语气标点')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补标点：语气标点缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('动作停顿')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('功能性问号')
    expect(prompt).toContain('补标点：语气标点缺口 2')
    expect(prompt).toContain('省略号/破折号')
  })

  test('carries quality audit sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 19, chapter_no: 19, title: '第三个证人' },
      [
        { id: 18, chapter_no: 18, title: '第二份证据' },
        { id: 19, chapter_no: 19, title: '第三个证人' },
      ],
      [
        {
          id: 231,
          chapter_id: 18,
          review_type: 'quality_audit_sync',
          created_at: '2026-06-09T08:42:00.000Z',
          payload: JSON.stringify({
            chapter_id: 18,
            chapter_no: 18,
            quality_audit_sync: {
              status: 'warn',
              label: '质量诊断缺口 2',
              summary: '正文有 2 项质量诊断缺口。',
              missed_count: 2,
              missed: [
                { label: '章节推进', text: '删掉这章不影响理解，第二份证据没有改变局势。' },
                { label: '信息负载', text: '一章新增 4 个概念，信息没有跟冲突走。' },
              ],
              next_actions: [
                '下一章必须补质量诊断：先证明本章不可删除，再把新概念压到 3 个以内，让信息跟冲突走。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '长夜账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 19,
        title: '第三个证人',
        summary: '沈砚找到第三个证人，让上一章证据真正改变局势。',
        conflict: '反派试图抢先封口第三个证人。',
        ending_hook: '第三个证人指出账本原件在祠堂地砖下。',
        scene_cards: [
          { scene_no: 1, title: '证人封口', reader_payoff: '质量诊断缺口被正文补上。' },
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
      { chapter_no: 19, title: '第三个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补质量诊断')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补诊断：质量诊断缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('本章不可删除')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('信息负载')
    expect(prompt).toContain('补诊断：质量诊断缺口 2')
    expect(prompt).toContain('新概念')
  })

  test('carries dialogue sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 20, chapter_no: 20, title: '当堂反问' },
      [
        { id: 19, chapter_no: 19, title: '当众试探' },
        { id: 20, chapter_no: 20, title: '当堂反问' },
      ],
      [
        {
          id: 232,
          chapter_id: 19,
          review_type: 'dialogue_sync',
          created_at: '2026-06-09T08:45:00.000Z',
          payload: JSON.stringify({
            chapter_id: 19,
            chapter_no: 19,
            dialogue_sync: {
              status: 'warn',
              label: '对白缺口 2',
              summary: '正文有 2 项对白质量缺口。',
              missed_count: 2,
              missed: [
                { label: '声线差异', text: '李玄、周薄森、林青禾都在用同一种解释规则的口吻。' },
                { label: '潜台词与议程', text: '角色把真实目的直接说出来，没有借口和试探。' },
              ],
              next_actions: [
                '下一章必须补对白：李玄用短句反问，周薄森长句辩解，林青禾只说事实；真实目的藏进借口和试探。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 20,
        title: '当堂反问',
        summary: '李玄用一句反问继续逼周薄森说漏证据来源。',
        conflict: '周薄森想用长篇说辞重新夺回话语权。',
        ending_hook: '林青禾拿出第二枚封条。',
        scene_cards: [
          { scene_no: 1, title: '反问压场', reader_payoff: '对白缺口被正文补上。' },
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
      { chapter_no: 20, title: '当堂反问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修对白')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修对白：对白缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李玄用短句反问')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('声线差异')
    expect(prompt).toContain('修对白：对白缺口 2')
    expect(prompt).toContain('真实目的藏进借口和试探')
  })

  test('carries character behavior sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 21, chapter_no: 21, title: '证人上堂' },
      [
        { id: 20, chapter_no: 20, title: '当堂反问' },
        { id: 21, chapter_no: 21, title: '证人上堂' },
      ],
      [
        {
          id: 233,
          chapter_id: 20,
          review_type: 'character_behavior_sync',
          created_at: '2026-06-09T08:55:00.000Z',
          payload: JSON.stringify({
            chapter_id: 20,
            chapter_no: 20,
            character_behavior_sync: {
              status: 'warn',
              label: '角色行为缺口 2',
              summary: '正文有 2 项角色行为缺口。',
              missed_count: 2,
              missed: [
                { label: '动机链', text: '李玄突然冲上去，没有写出起因、意图、约束和风险。' },
                { label: '反派逻辑', text: '周薄森明明可以销毁账本，却降智站桩嘲讽。' },
              ],
              next_actions: [
                '下一章必须补角色行为：先写清李玄的动机链，再让周薄森的反派逻辑从保住账本来源出发。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 21,
        title: '证人上堂',
        summary: '林青禾作为证人上堂，李玄继续保护证据来源。',
        conflict: '周薄森试图把证据来源抹成私怨。',
        ending_hook: '真正的账本原件被指出在祠堂地砖下。',
        scene_cards: [
          { scene_no: 1, title: '证人上堂', reader_payoff: '角色行为缺口被正文补上。' },
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
      { chapter_no: 21, title: '证人上堂' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补角色行为')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补行为：角色行为缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李玄的动机链')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('反派逻辑')
    expect(prompt).toContain('补行为：角色行为缺口 2')
    expect(prompt).toContain('保住账本来源')
  })

  test('carries asset linkage sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 23, chapter_no: 23, title: '地砖原件' },
      [
        { id: 22, chapter_no: 22, title: '旧钥匙开缝' },
        { id: 23, chapter_no: 23, title: '地砖原件' },
      ],
      [
        {
          id: 234,
          chapter_id: 22,
          review_type: 'asset_linkage_sync',
          created_at: '2026-06-09T09:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 22,
            chapter_no: 22,
            asset_linkage_sync: {
              status: 'warn',
              label: '资产挂钩缺口 2',
              summary: '正文有 2 项资产挂钩缺口。',
              missed_count: 2,
              missed: [
                { label: '功能链', text: '旧钥匙只被点名，没有绑定功能、触发条件、限制和后果。' },
                { label: '孤立资产', text: '禁门规则没有推进目标、制造阻碍、兑现伏笔或打开章尾钩子。' },
              ],
              next_actions: [
                '下一章必须补资产挂钩：旧钥匙要触发暗格并留下锁死代价，禁门规则要逼出账本原件位置。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 23,
        title: '地砖原件',
        summary: '李玄用旧钥匙打开地砖暗格，找到账本原件。',
        conflict: '周薄森试图抢先触发禁门规则锁死李玄。',
        ending_hook: '账本原件最后一页出现第二枚血契编号。',
        scene_cards: [
          { scene_no: 1, title: '地砖原件', reader_payoff: '资产挂钩缺口被正文补上。' },
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
      { chapter_no: 23, title: '地砖原件' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补资产挂钩')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('挂资产：资产挂钩缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧钥匙要触发暗格')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('孤立资产')
    expect(prompt).toContain('挂资产：资产挂钩缺口 2')
    expect(prompt).toContain('禁门规则要逼出账本原件位置')
  })

  test('carries state tracking sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 24, chapter_no: 24, title: '第二枚编号' },
      [
        { id: 23, chapter_no: 23, title: '地砖原件' },
        { id: 24, chapter_no: 24, title: '第二枚编号' },
      ],
      [
        {
          id: 235,
          chapter_id: 23,
          review_type: 'state_tracking_sync',
          created_at: '2026-06-09T09:15:00.000Z',
          payload: JSON.stringify({
            chapter_id: 23,
            chapter_no: 23,
            state_tracking_sync: {
              status: 'warn',
              label: '状态跟踪缺口 2',
              summary: '正文有 2 项状态跟踪缺口。',
              missed_count: 2,
              missed: [
                { label: '角色状态', text: '李玄左臂旧伤和残阵三息限制被写反。' },
                { label: '世界约束', text: '禁门三息锁死规则没有生效。' },
              ],
              next_actions: [
                '下一章必须补状态跟踪：李玄仍受左臂旧伤和残阵三息限制，禁门三息锁死规则必须继续生效。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 24,
        title: '第二枚编号',
        summary: '李玄在三息限制内追查第二枚血契编号。',
        conflict: '禁门开始锁死，周薄森试图把李玄困在暗格前。',
        ending_hook: '第二枚编号对应林青禾的封条来源。',
        scene_cards: [
          { scene_no: 1, title: '第二枚编号', reader_payoff: '状态跟踪缺口被正文补上。' },
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
      { chapter_no: 24, title: '第二枚编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补状态跟踪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补状态：状态跟踪缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李玄仍受左臂旧伤')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('世界约束')
    expect(prompt).toContain('补状态：状态跟踪缺口 2')
    expect(prompt).toContain('禁门三息锁死规则必须继续生效')
  })

  test('carries source readiness sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 25, chapter_no: 25, title: '补齐来源' },
      [
        { id: 24, chapter_no: 24, title: '缺源测试' },
        { id: 25, chapter_no: 25, title: '补齐来源' },
      ],
      [
        {
          id: 247,
          chapter_id: 24,
          review_type: 'source_readiness_sync',
          created_at: '2026-06-09T11:40:00.000Z',
          payload: JSON.stringify({
            chapter_id: 24,
            chapter_no: 24,
            source_readiness_sync: {
              status: 'warn',
              label: '来源就绪缺口 2',
              summary: '写前来源有 2 项未就绪。',
              missed_count: 2,
              missed: [
                { label: '上一章正文/章尾钩子', text: '上一章正文缺失，不能确认旧楼门牌变化。' },
                { label: '角色状态', text: '角色状态只有名字，没有当前位置和认知边界。' },
              ],
              next_actions: [
                '下一章必须补来源就绪：先补齐上一章正文、角色状态和认知边界，再把旧楼门牌变化写成当前行动依据。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼规则', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 25,
        title: '补齐来源',
        summary: '主角确认旧楼门牌变化来自上一章最后一幕。',
        conflict: '角色状态和认知边界决定他们不能直接打开旧楼门。',
        ending_hook: '旧楼门牌背面出现新的时间戳。',
        scene_cards: [
          { scene_no: 1, title: '来源补齐', reader_payoff: '来源就绪缺口被正文补上。' },
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
      { chapter_no: 25, title: '补齐来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补来源：来源就绪缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先补齐上一章正文')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('角色状态')
    expect(prompt).toContain('补来源：来源就绪缺口 2')
    expect(prompt).toContain('旧楼门牌变化写成当前行动依据')
  })

  test('carries prose meta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 16, chapter_no: 16, title: '火漆背面' },
      [
        { id: 15, chapter_no: 15, title: '袖口旧印' },
        { id: 16, chapter_no: 16, title: '火漆背面' },
      ],
      [
        {
          id: 248,
          chapter_id: 15,
          review_type: 'prose_meta_sync',
          created_at: '2026-06-09T12:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 15,
            chapter_no: 15,
            prose_meta_sync: {
              status: 'warn',
              label: '正文元信息缺口 3',
              summary: '正文有 3 处作者视角元信息。',
              missed_count: 3,
              missed: [
                { term: '上一章', line: 2, evidence: '林青禾按住袖口，想起上一章那枚旧印。' },
                { term: '伏笔', line: 3, evidence: '账册夹页里还藏着一处伏笔。' },
                { term: '读者', line: 3, evidence: '读者会在这里明白代价。' },
              ],
              next_actions: [
                '下一章必须修正文元信息：把“上一章/伏笔/读者”改成角色当下能感知的事件锚点或相对时间。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '袖口旧印', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 16,
        title: '火漆背面',
        summary: '林青禾翻看火漆背面的旧印来源。',
        conflict: '她必须在会长追问前把旧印来源变成现场证据。',
        ending_hook: '火漆背面露出第二枚编号。',
        scene_cards: [
          { scene_no: 1, title: '火漆背面', reader_payoff: '正文元信息缺口被现场事件锚点替代。' },
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
      { chapter_no: 16, title: '火漆背面' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修正文元信息')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修元信息：正文元信息缺口 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('角色当下能感知')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('上一章')
    expect(prompt).toContain('修元信息：正文元信息缺口 3')
    expect(prompt).toContain('上一章/伏笔/读者')
  })

  test('carries prose meta execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 16, chapter_no: 16, title: '火漆背面' },
      [
        { id: 15, chapter_no: 15, title: '袖口旧印' },
        { id: 16, chapter_no: 16, title: '火漆背面' },
      ],
      [
        {
          id: 249,
          chapter_id: 15,
          review_type: 'prose_quality',
          created_at: '2026-06-09T12:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 15,
            chapter_no: 15,
            self_check: {
              review: {
                prose_meta_checks: [
                  {
                    label: '工程词泄露',
                    status: 'warn',
                    matched_term: '上一章',
                    location: '第2段第1句',
                    replacement: '刚才袖口旧印烫亮的那一刻',
                    evidence: '林青禾按住袖口，想起上一章那枚旧印。',
                    fix: '下一章必须把上一章改成角色当下能感知的事件锚点。',
                    remaining_risk: '不要再出现上一章、本章、读者等工程词。',
                  },
                  {
                    label: '标题行安全',
                    status: 'pass',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '袖口旧印', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 16,
        title: '火漆背面',
        summary: '林青禾翻看火漆背面的旧印来源。',
        conflict: '她必须在会长追问前把旧印来源变成现场证据。',
        ending_hook: '火漆背面露出第二枚编号。',
        scene_cards: [
          { scene_no: 1, title: '火漆背面', reader_payoff: '正文元信息缺口被现场事件锚点替代。' },
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
      { chapter_no: 16, title: '火漆背面' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修工程词')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('正文元信息：工程词泄露 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('prose_meta_checks.工程词泄露')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('matched_term=上一章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('location=第2段第1句')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('replacement=刚才袖口旧印烫亮的那一刻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('标题行安全')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('matched_term')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('replacement')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('remaining_risk')
    expect(prompt).toContain('prose_meta_checks.工程词泄露')
    expect(prompt).toContain('不要再出现上一章')
  })

  test('carries spectator reaction sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 10, chapter_no: 10, title: '账房改口' },
      [
        { id: 9, chapter_no: 9, title: '公审台' },
        { id: 10, chapter_no: 10, title: '账房改口' },
      ],
      [
        {
          id: 249,
          chapter_id: 9,
          review_type: 'spectator_reaction_sync',
          created_at: '2026-06-09T12:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 9,
            chapter_no: 9,
            spectator_reaction_sync: {
              status: 'warn',
              label: '围观反应缺口 1',
              summary: '公开反证只写了统一震惊，没有差异化围观者反应。',
              missed_count: 1,
              missed: [
                {
                  key: 'spectator_reaction_unified',
                  label: '围观反应分层',
                  evidence: '全场瞬间震惊，所有人都倒吸一口凉气。',
                  fix: '补普通人、懂行者、反派至少两层差异化反应。',
                },
              ],
              next_actions: [
                '下一章必须补围观反应：普通人停喊、懂行者核对账册、反派后退或改口，至少两层基于利益目标的差异化反应。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '公审账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 10,
        title: '账房改口',
        summary: '账房老吏被迫解释账册墨色和旧印来源。',
        conflict: '周薄森试图用全场喧哗盖过账房证词。',
        ending_hook: '账房说出第二个证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '账房改口', reader_payoff: '围观反应从统一震惊变成可见立场翻转。' },
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
      { chapter_no: 10, title: '账房改口' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补围观反应')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补围观：围观反应缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('普通人停喊')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('全场瞬间震惊')
    expect(prompt).toContain('补围观：围观反应缺口 1')
    expect(prompt).toContain('至少两层基于利益目标的差异化反应')
  })

  test('carries payoff setup sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 11, chapter_no: 11, title: '录音来源' },
      [
        { id: 10, chapter_no: 10, title: '公审台' },
        { id: 11, chapter_no: 11, title: '录音来源' },
      ],
      [
        {
          id: 250,
          chapter_id: 10,
          review_type: 'payoff_setup_sync',
          created_at: '2026-06-09T12:45:00.000Z',
          payload: JSON.stringify({
            chapter_id: 10,
            chapter_no: 10,
            payoff_setup_sync: {
              status: 'warn',
              label: '爽点铺垫缺口 1',
              summary: '检测报告打脸前缺少可指认的危机、暗牌或来源铺垫。',
              missed_count: 1,
              missed: [
                {
                  key: 'payoff_without_setup_3',
                  label: '爽点铺垫扫描',
                  evidence: '他突然拿出一份检测报告，当众打脸所有质疑者。',
                  fix: '在兑现前补线索、暗牌、录音/报告来源、角色提前准备或反派得意误判。',
                },
              ],
              next_actions: [
                '下一章必须补爽点铺垫：先写录音键红点、档案室报告来源和反派得意误判，再兑现检测报告反证。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '公审账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 11,
        title: '录音来源',
        summary: '李辰解释检测报告和录音来源，让上一章打脸变成可回看的证据链。',
        conflict: '周薄森试图质疑报告来源，逼李辰补全证据链。',
        ending_hook: '录音里出现第二个证人的声音。',
        scene_cards: [
          { scene_no: 1, title: '录音来源', reader_payoff: '爽点铺垫缺口被证据来源补上。' },
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
      { chapter_no: 11, title: '录音来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补爽点铺垫')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补铺垫：爽点铺垫缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('录音键红点')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('突然拿出一份检测报告')
    expect(prompt).toContain('补铺垫：爽点铺垫缺口 1')
    expect(prompt).toContain('先写录音键红点')
  })

  test('carries intent confirmation sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 25, chapter_no: 25, title: '封条来源' },
      [
        { id: 24, chapter_no: 24, title: '第二枚编号' },
        { id: 25, chapter_no: 25, title: '封条来源' },
      ],
      [
        {
          id: 236,
          chapter_id: 24,
          review_type: 'intent_confirmation_sync',
          created_at: '2026-06-09T09:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 24,
            chapter_no: 24,
            intent_confirmation_sync: {
              status: 'warn',
              label: '意图确认缺口 2',
              summary: '正文有 2 项意图确认缺口。',
              missed_count: 2,
              missed: [
                { label: '代价/收益', text: '林青禾公开得罪会长的代价没有落地。' },
                { label: '章尾承接', text: '第二枚编号没有接到下一章问题。' },
              ],
              next_actions: [
                '下一章必须补意图确认：先让代价收益可见，再把第二枚编号接成章尾追问。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 25,
        title: '封条来源',
        summary: '李玄追问第二枚编号背后的封条来源。',
        conflict: '会长试图把林青禾公开作证的代价转成对她的惩罚。',
        ending_hook: '封条来源指向禁门外的第三个证人。',
        scene_cards: [
          { scene_no: 1, title: '封条来源', reader_payoff: '意图确认缺口被正文补上。' },
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
      { chapter_no: 25, title: '封条来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修意图确认')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修意图：意图确认缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先让代价收益可见')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('章尾承接')
    expect(prompt).toContain('修意图：意图确认缺口 2')
    expect(prompt).toContain('第二枚编号接成章尾追问')
  })

  test('carries nested pre-draft execution receipt misses from prose quality into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 31, chapter_no: 31, title: '第三枚封条' },
      [
        {
          id: 30,
          chapter_no: 30,
          title: '封条滴血',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_target',
                    label: '情绪目标',
                    delivered: false,
                    evidence: '正文只写了发现封条，没有从压迫转到反制。',
                    remaining_risk: '压迫后的反制情绪没有落到正文。',
                  },
                ],
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: false,
                    evidence: '没有三轮压问，证据一出现就结束。',
                    remaining_risk: '文风召回里的先压后爆没有执行。',
                  },
                ],
              },
            },
          },
        },
        { id: 31, chapter_no: 31, title: '第三枚封条' },
      ],
      [
        {
          id: 730,
          chapter_id: 30,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 30,
            chapter_no: 30,
            score: 86,
            passed: true,
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_target',
                    label: '情绪目标',
                    delivered: false,
                    evidence: '正文只写了发现封条，没有从压迫转到反制。',
                    remaining_risk: '压迫后的反制情绪没有落到正文。',
                  },
                ],
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: false,
                    evidence: '没有三轮压问，证据一出现就结束。',
                    remaining_risk: '文风召回里的先压后爆没有执行。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 31,
        title: '第三枚封条',
        summary: '李玄追查第三枚封条的来源。',
        conflict: '会长试图把封条滴血解释成旧规误判。',
        ending_hook: '第三枚封条指向内门供词。',
        scene_cards: [
          { scene_no: 1, title: '第三枚封条', reader_payoff: '写前执行缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:30:00.000Z',
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
      { chapter_no: 31, title: '第三枚封条' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修意图确认')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('意图确认：执行偏移 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风召回：召回缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('压迫后的反制情绪没有落到正文')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('文风召回里的先压后爆没有执行')
    expect(prompt).toContain('压迫后的反制情绪没有落到正文')
    expect(prompt).toContain('文风召回里的先压后爆没有执行')
  })

  test('carries intent confirmation execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 32, chapter_no: 32, title: '反制封条' },
      [
        { id: 31, chapter_no: 31, title: '第三枚封条' },
        { id: 32, chapter_no: 32, title: '反制封条' },
      ],
      [
        {
          id: 731,
          chapter_id: 31,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:31:00.000Z',
          payload: JSON.stringify({
            chapter_id: 31,
            chapter_no: 31,
            self_check: {
              review: {
                intent_confirmation_checks: [
                  {
                    key: 'chapter_goal_drift',
                    label: '章节目标偏移',
                    status: 'fail',
                    intent_field: 'chapter_goal',
                    expected_intent: '本章目标必须让李玄用第三枚封条反制会长。',
                    delivered_evidence: '正文只解释封条来历，没有让李玄形成反制。',
                    blueprint_link: 'chapter_blueprint.core_turn',
                    evidence: '章节目标从反制会长偏成解释设定。',
                    fix: '下一章开篇先让第三枚封条造成会长规则误判，中段让李玄用误判反制。',
                    remaining_risk: '不能继续把第三枚封条写成设定说明。',
                  },
                  {
                    key: 'emotion_target_ok',
                    label: '情绪目标',
                    status: 'pass',
                    intent_field: 'emotion_target',
                    expected_intent: '从压迫转为反制。',
                    delivered_evidence: '已兑现。',
                    blueprint_link: 'chapter_blueprint.emotion',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 32,
        title: '反制封条',
        summary: '李玄用第三枚封条造成会长规则误判。',
        conflict: '会长试图把封条误判解释成旧规误差。',
        ending_hook: '误判结果指向第四枚封条。',
        scene_cards: [
          { scene_no: 1, title: '封条误判', reader_payoff: '意图确认字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:32:00.000Z',
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
      { chapter_no: 32, title: '反制封条' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修意图确认')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('意图确认：执行偏移 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('intent_confirmation_checks.章节目标偏移')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('intent_field=chapter_goal')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expected_intent=本章目标必须让李玄用第三枚封条反制会长')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('blueprint_link=chapter_blueprint.core_turn')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('情绪目标')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('意图确认')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('intent_field')
    expect(prompt).toContain('intent_confirmation_checks.章节目标偏移')
    expect(prompt).toContain('不能继续把第三枚封条写成设定说明')
  })

  test('carries write-preparation execution receipt misses into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 32, chapter_no: 32, title: '钥匙回声' },
      [
        {
          id: 31,
          chapter_no: 31,
          title: '第三枚封条',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'asset_linkage',
                    label: '旧钥匙挂钩',
                    delivered: false,
                    evidence: '正文用了旧钥匙开门，但没有交代旧钥匙和母亲旧铺印记的关系。',
                    remaining_risk: '孤立资产仍未挂到主线证据链。',
                  },
                ],
              },
            },
          },
        },
        { id: 32, chapter_no: 32, title: '钥匙回声' },
      ],
      [
        {
          id: 731,
          chapter_id: 31,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:40:00.000Z',
          payload: JSON.stringify({
            chapter_id: 31,
            chapter_no: 31,
            score: 84,
            passed: true,
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'asset_linkage',
                    label: '旧钥匙挂钩',
                    delivered: false,
                    evidence: '正文用了旧钥匙开门，但没有交代旧钥匙和母亲旧铺印记的关系。',
                    remaining_risk: '孤立资产仍未挂到主线证据链。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 32,
        title: '钥匙回声',
        summary: '李玄用旧钥匙反查母亲旧铺印记。',
        conflict: '会长试图把旧钥匙解释成伪造证据。',
        ending_hook: '旧钥匙的回声指向旧铺账本。',
        scene_cards: [
          { scene_no: 1, title: '钥匙回声', reader_payoff: '写前准备缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:45:00.000Z',
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
      { chapter_no: 32, title: '钥匙回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修写前准备')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('写前准备：执行缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('孤立资产仍未挂到主线证据链')
    expect(prompt).toContain('写前准备：执行缺口 1')
    expect(prompt).toContain('旧钥匙和母亲旧铺印记')
  })

  test('carries write preparation execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 33, chapter_no: 33, title: '钥匙归属' },
      [
        { id: 32, chapter_no: 32, title: '钥匙回声' },
        { id: 33, chapter_no: 33, title: '钥匙归属' },
      ],
      [
        {
          id: 733,
          chapter_id: 32,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:45:30.000Z',
          payload: JSON.stringify({
            chapter_id: 32,
            chapter_no: 32,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'asset_risk_old_key',
                    label: '旧钥匙资产风险',
                    status: 'fail',
                    preparation_type: 'asset_risks',
                    expected: '旧钥匙必须和母亲旧铺印记挂钩，并成为主线证据。',
                    delivered_evidence: '正文只让旧钥匙开门，没有说明旧铺印记。',
                    chapter_location: '中段开门场',
                    evidence: '旧钥匙仍像孤立道具。',
                    fix: '下一章中段让旧钥匙回声指向母亲旧铺印记。',
                    remaining_risk: '不能继续把旧钥匙只当开门工具。',
                  },
                  {
                    key: 'blueprint_focus_ok',
                    label: '蓝图焦点',
                    status: 'pass',
                    preparation_type: 'blueprint_focus',
                    expected: '本章必须追查钥匙来源。',
                    delivered_evidence: '已兑现。',
                    chapter_location: '第一场',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 33,
        title: '钥匙归属',
        summary: '李玄把旧钥匙回声和母亲旧铺印记挂钩。',
        conflict: '会长试图把旧钥匙解释成普通钥匙。',
        ending_hook: '旧铺印记背面露出第二把钥匙编号。',
        scene_cards: [
          { scene_no: 1, title: '钥匙归属', reader_payoff: '写前准备字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:46:00.000Z',
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
      { chapter_no: 33, title: '钥匙归属' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修写前准备')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('写前准备：执行缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('write_preparation_checks.旧钥匙资产风险')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('preparation_type=asset_risks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('母亲旧铺印记')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_location=中段开门场')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('蓝图焦点')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('写前准备')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('asset_risks')
    expect(prompt).toContain('write_preparation_checks.旧钥匙资产风险')
    expect(prompt).toContain('不能继续把旧钥匙只当开门工具')
  })

  test('carries creation contract execution misses as priority work into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 33, chapter_no: 33, title: '第二条规则' },
      [
        {
          id: 32,
          chapter_no: 32,
          title: '钥匙回声',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_target_reader',
                    label: '创作契约：目标读者',
                    delivered: false,
                    evidence: '正文只写旧钥匙开门，没有给规则破解读者可感知的反制回报。',
                    remaining_risk: '目标读者想看的规则破解爽点没有落成正文证据。',
                  },
                ],
              },
            },
          },
        },
        { id: 33, chapter_no: 33, title: '第二条规则' },
      ],
      [
        {
          id: 732,
          chapter_id: 32,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:46:00.000Z',
          payload: JSON.stringify({
            chapter_id: 32,
            chapter_no: 32,
            score: 86,
            passed: true,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_target_reader',
                    label: '创作契约：目标读者',
                    status: 'warn',
                    evidence: '正文只写旧钥匙开门，没有给规则破解读者可感知的反制回报。',
                    fix: '下一章补出规则破解爽点：让旧钥匙触发规则判定、代价和反制结果。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 33,
        title: '第二条规则',
        summary: '李玄用旧钥匙反推第二条规则。',
        conflict: '会长试图把反制结果解释成偶然。',
        ending_hook: '旧钥匙浮出第二个旧铺印记。',
        scene_cards: [
          { scene_no: 1, title: '第二条规则', reader_payoff: '规则破解爽点被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:47:00.000Z',
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
      { chapter_no: 33, title: '第二条规则' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：执行缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('规则破解爽点')
    expect(prompt).toContain('创作契约：执行缺口 1')
    expect(prompt).toContain('规则破解读者可感知的反制回报')
  })

  test('turns creation contract carry-over into staged repair actions for the next chapter', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 34, chapter_no: 34, title: '第三条规则' },
      [
        {
          id: 33,
          chapter_no: 33,
          title: '第二条规则',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_reader_retention',
                    label: '创作契约：追读留存',
                    delivered: false,
                    evidence: '章末只解释第二条规则，没有把规则破解后的新威胁挂到下一章。',
                    remaining_risk: '追读留存契约没有落成章末新问题和下一章行动压力。',
                  },
                ],
              },
            },
          },
        },
        { id: 34, chapter_no: 34, title: '第三条规则' },
      ],
      [
        {
          id: 733,
          chapter_id: 33,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:48:00.000Z',
          payload: JSON.stringify({
            chapter_id: 33,
            chapter_no: 33,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_reader_retention',
                    label: '创作契约：追读留存',
                    status: 'warn',
                    evidence: '章末只解释第二条规则，没有把规则破解后的新威胁挂到下一章。',
                    fix: '下一章开篇先承接第二条规则的后果，中段让第三条规则制造反制代价，章尾抛出更高一级的新问题。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 34,
        title: '第三条规则',
        summary: '李玄追查第三条规则的代价。',
        conflict: '第三条规则要求他在救人和保留证据之间做选择。',
        ending_hook: '第三条规则背后浮出旧铺真正主人。',
        scene_cards: [
          { scene_no: 1, title: '第三条规则', reader_payoff: '追读留存缺口被转成新威胁。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:49:00.000Z',
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
      { chapter_no: 34, title: '第三条规则' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('创作契约')
    expect(prompt).toContain('下一章开篇先承接第二条规则的后果')
    expect(prompt).toContain('章尾抛出更高一级的新问题')
  })

  test('prioritizes creation contract misses over ordinary delivery risks', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 35, chapter_no: 35, title: '第四条规则' },
      [
        {
          id: 34,
          chapter_no: 34,
          title: '第三条规则',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_core_promise',
                    label: '创作契约：核心承诺',
                    delivered: false,
                    evidence: '正文写了规则解释，但没有兑现主角用规则反杀的核心承诺。',
                    remaining_risk: '核心承诺没有落成读者可感知的规则反杀证据。',
                  },
                ],
              },
            },
          },
        },
        { id: 35, chapter_no: 35, title: '第四条规则' },
      ],
      [
        {
          id: 734,
          chapter_id: 34,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-10T08:50:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            chapter_core_drift: {
              status: 'warn',
              label: '核心偏移',
              risk_count: 1,
              issues: [{ label: '核心偏移', issue: '章末只总结规则，没有留下新的追查目标。' }],
            },
          }),
        },
        {
          id: 735,
          chapter_id: 34,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:51:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_core_promise',
                    label: '创作契约：核心承诺',
                    status: 'warn',
                    evidence: '正文写了规则解释，但没有兑现主角用规则反杀的核心承诺。',
                    fix: '下一章必须先用第四条规则写出主角主动设局、触发规则、反制对手的正文证据。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(deliveryRiskCarryOver?.items[0]).toContain('创作契约：执行缺口 1')
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('守核心：核心偏移')
    expect(deliveryRiskCarryOver?.required_actions.join('｜')).toContain('规则反杀')
  })

  test('treats target reader and genre positioning misses as creation contract carry-over', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 36, chapter_no: 36, title: '第五条规则' },
      [
        { id: 35, chapter_no: 35, title: '第四条规则' },
        { id: 36, chapter_no: 36, title: '第五条规则' },
      ],
      [
        {
          id: 736,
          chapter_id: 35,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:52:00.000Z',
          payload: JSON.stringify({
            chapter_id: 35,
            chapter_no: 35,
            self_check: {
              review: {
                target_reader_checks: [
                  {
                    key: 'reader_desire_visible_payoff',
                    label: '目标读者：规则破解爽点',
                    status: 'warn',
                    evidence: '正文让主角解释规则，但没有给读者看到规则破解后的反制快感。',
                    fix: '下一章必须把目标读者想看的规则破解爽点写成主角主动验证、触发规则、反制对手的现场证据。',
                  },
                ],
                genre_positioning_checks: [
                  {
                    key: 'genre_formula_anchor',
                    label: '题材定位：规则怪谈公式',
                    status: 'fail',
                    evidence: '本章规则只像背景设定，没有形成规则压力、试探代价和破局公式。',
                    fix: '下一章必须用规则压力、试探代价、破局公式三步拉回规则怪谈题材长板。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 36,
        title: '第五条规则',
        summary: '李玄用第五条规则反查旧铺主人。',
        conflict: '旧铺主人试图让规则反噬李玄。',
        ending_hook: '第五条规则指向母亲旧案真正证人。',
        scene_cards: [
          { scene_no: 1, title: '第五条规则', reader_payoff: '目标读者和题材定位缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:53:00.000Z',
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
      { chapter_no: 36, title: '第五条规则' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('创作契约：目标读者缺口 1')
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('创作契约：题材定位缺口 1')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('规则压力、试探代价、破局公式')
    expect(prompt).toContain('规则破解后的反制快感')
    expect(prompt).toContain('规则压力、试探代价、破局公式')
  })

  test('carries prose self-review chapter handoff misses into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 34, chapter_no: 34, title: '水痕名单' },
      [
        { id: 33, chapter_no: 33, title: '门外水痕' },
        { id: 34, chapter_no: 34, title: '水痕名单' },
      ],
      [
        {
          id: 733,
          chapter_id: 33,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:50:00.000Z',
          payload: JSON.stringify({
            chapter_id: 33,
            chapter_no: 33,
            score: 86,
            passed: true,
            self_check: {
              review: {
                chapter_handoff_checks: [
                  {
                    key: 'opening_obligation',
                    label: '开篇义务',
                    status: 'warn',
                    evidence: '前300字直接切到新场景，没有接住上一章玻璃门水痕。',
                    fix: '下一章开篇先回到玻璃门前确认水痕名单，再推进新线索。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 34,
        title: '水痕名单',
        summary: '李辰回到玻璃门前核对水痕名单。',
        conflict: '宿舍规则阻止他公开查名单。',
        ending_hook: '名单末尾出现主角自己的名字。',
        scene_cards: [
          { scene_no: 1, title: '核对水痕', reader_payoff: '章首承接缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:55:00.000Z',
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
      { chapter_no: 34, title: '水痕名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章首承接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章首承接：承接缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('前300字直接切到新场景')
    expect(prompt).toContain('章首承接：承接缺口 1')
    expect(prompt).toContain('玻璃门前确认水痕名单')
  })

  test('carries prose review chapter handoff execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 35, chapter_no: 35, title: '旧广播室' },
      [
        { id: 34, chapter_no: 34, title: '水痕名单' },
        { id: 35, chapter_no: 35, title: '旧广播室' },
      ],
      [
        {
          id: 734,
          chapter_id: 34,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:56:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            self_check: {
              review: {
                chapter_handoff_checks: [
                  {
                    key: 'previous_handoff_unresolved',
                    label: '上一章承接',
                    status: 'fail',
                    previous_handoff: '名单末尾出现主角自己的名字。',
                    opening_obligation: '下一章前300字必须让主角先核对名单水痕和自己的名字。',
                    opening_evidence: '正文开篇直接跳到旧广播室，没有回看水痕名单。',
                    location: '前300字',
                    continuity_action: '先让主角用湿鞋印反查名单来源，再进入旧广播室。',
                    evidence: '上一章章末钩子沉没。',
                    fix: '下一章第一场先处理名单末尾自己的名字，再推进广播室。',
                    remaining_risk: '不能把名单钩子留到中段旁白解释。',
                  },
                  {
                    key: 'handoff_ok',
                    label: '章末交接',
                    status: 'pass',
                    previous_handoff: '已承接湿鞋印。',
                    opening_obligation: '已完成。',
                    opening_evidence: '已兑现。',
                    location: '前300字',
                    continuity_action: '已落地。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 35,
        title: '旧广播室',
        summary: '李辰带着水痕名单追到旧广播室。',
        conflict: '广播室门禁要求他先证明名单来源。',
        ending_hook: '广播里念出名单第二个名字。',
        scene_cards: [
          { scene_no: 1, title: '名单回看', conflict: '水痕名单逼主角先核对自己的名字。' },
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
      { chapter_no: 35, title: '旧广播室' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章首承接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章首承接：承接缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_handoff_checks.上一章承接')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('名单末尾出现主角自己的名字')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先让主角用湿鞋印反查名单来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('已承接湿鞋印')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('水痕名单')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('continuity_action')
    expect(prompt).toContain('chapter_handoff_checks.上一章承接')
    expect(prompt).toContain('不能把名单钩子留到中段旁白解释')
  })

  test('carries continuity heat sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 27, chapter_no: 27, title: '值夜室' },
      [
        { id: 26, chapter_no: 26, title: '门外水声' },
        { id: 27, chapter_no: 27, title: '值夜室' },
      ],
      [
        {
          id: 237,
          chapter_id: 26,
          review_type: 'continuity_heat_sync',
          created_at: '2026-06-09T09:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 26,
            chapter_no: 26,
            continuity_heat_sync: {
              status: 'warn',
              label: '连续性热度缺口 2',
              summary: '正文有 2 项连续性热度缺口。',
              missed_count: 2,
              missed: [
                { label: '活跃期待', text: '门外水声没有继续施压，也没有转成值夜室行动。' },
                { label: '休眠边界', text: '夜巡司令牌被突然激活解决门外水声。' },
              ],
              next_actions: [
                '下一章必须补连续性热度：让门外水声逼出值夜室行动，并解释夜巡司令牌为什么不能解决当前危机。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 27,
        title: '值夜室',
        summary: '李辰进入值夜室追查门外水声来源。',
        conflict: '夜巡司令牌不能使用，值夜室门禁只认湿鞋印。',
        ending_hook: '镜中脚印和水声指向同一个失踪学生。',
        scene_cards: [
          { scene_no: 1, title: '值夜室', reader_payoff: '连续性热度缺口被正文补上。' },
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
      { chapter_no: 27, title: '值夜室' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补连续性热度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补热度：连续性热度缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外水声逼出值夜室行动')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('休眠边界')
    expect(prompt).toContain('补热度：连续性热度缺口 2')
    expect(prompt).toContain('夜巡司令牌为什么不能解决当前危机')
  })

  test('carries conflict structure sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 29, chapter_no: 29, title: '医院设备' },
      [
        { id: 28, chapter_no: 28, title: '设备间门口' },
        { id: 29, chapter_no: 29, title: '医院设备' },
      ],
      [
        {
          id: 238,
          chapter_id: 28,
          review_type: 'conflict_structure_sync',
          created_at: '2026-06-09T09:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 28,
            chapter_no: 28,
            conflict_structure_sync: {
              status: 'warn',
              label: '冲突结构缺口 2',
              summary: '正文有 2 项冲突结构缺口。',
              missed_count: 2,
              missed: [
                { label: '冲突阶梯', text: '协会成员没有从言语升级到行动阻碍。' },
                { label: '胜负变化', text: '客户资格从拒绝到认可没有落地。' },
              ],
              next_actions: [
                '下一章必须补冲突结构：先让协会会长真实阻止主角进入医院设备间，再写清客户资格胜负变化。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 29,
        title: '医院设备',
        summary: '主角进入医院设备间核验第二份封单。',
        conflict: '协会会长亲自封锁设备间，要求客户撤回授权。',
        ending_hook: '医院设备错误码指向协会内部账本。',
        scene_cards: [
          { scene_no: 1, title: '医院设备', reader_payoff: '冲突结构缺口被正文补上。' },
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
      { chapter_no: 29, title: '医院设备' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补冲突结构')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补冲突：冲突结构缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('协会会长真实阻止主角')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('胜负变化')
    expect(prompt).toContain('补冲突：冲突结构缺口 2')
    expect(prompt).toContain('客户资格胜负变化')
  })

  test('carries upgrade rhythm sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 31, chapter_no: 31, title: '医院红色警报' },
      [
        { id: 30, chapter_no: 30, title: '隐藏工具箱' },
        { id: 31, chapter_no: 31, title: '医院红色警报' },
      ],
      [
        {
          id: 239,
          chapter_id: 30,
          review_type: 'upgrade_rhythm_sync',
          created_at: '2026-06-09T09:35:00.000Z',
          payload: JSON.stringify({
            chapter_id: 30,
            chapter_no: 30,
            upgrade_rhythm_sync: {
              status: 'warn',
              label: '升级节奏缺口 2',
              summary: '正文有 2 项升级节奏缺口。',
              missed_count: 2,
              missed: [
                { label: '反馈闭环', text: '系统解锁隐藏工具箱后没有展示以前做不到的事。' },
                { label: '桥段节奏', text: '升级后没有接到医院设备这个更高门槛。' },
              ],
              next_actions: [
                '下一章必须补升级节奏：先展示隐藏工具箱能识别红色警报，再把医院设备写成更高门槛。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 31,
        title: '医院红色警报',
        summary: '主角用隐藏工具箱识别医院设备红色警报。',
        conflict: '医院设备故障等级高于旧城设备间，工具箱只能识别不能直接修复。',
        ending_hook: '红色警报背后出现协会内部账本编号。',
        scene_cards: [
          { scene_no: 1, title: '红色警报', reader_payoff: '升级节奏缺口被正文补上。' },
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
      { chapter_no: 31, title: '医院红色警报' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补升级节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补升级：升级节奏缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('隐藏工具箱能识别红色警报')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('桥段节奏')
    expect(prompt).toContain('补升级：升级节奏缺口 2')
    expect(prompt).toContain('医院设备写成更高门槛')
  })

  test('carries target reader sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 32, chapter_no: 32, title: '水声后的账本' },
      [
        { id: 31, chapter_no: 31, title: '旧钥匙缺口' },
        { id: 32, chapter_no: 32, title: '水声后的账本' },
      ],
      [
        {
          id: 240,
          chapter_id: 31,
          review_type: 'target_reader_sync',
          created_at: '2026-06-09T09:45:00.000Z',
          payload: JSON.stringify({
            chapter_id: 31,
            chapter_no: 31,
            target_reader_sync: {
              status: 'warn',
              label: '目标读者缺口 2',
              summary: '正文有 2 项目标读者缺口。',
              missed_count: 2,
              missed: [
                { label: '读者欲望', text: '规则反制爽点没有落成正文事件。' },
                { label: '本章吸引点', text: '旧钥匙缺口没有给出可感知回报。' },
              ],
              next_actions: [
                '下一章必须补目标读者：把规则反制写成现场行动，并让旧钥匙缺口给出可感知回报。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 32,
        title: '水声后的账本',
        summary: '主角顺着旧钥匙缺口和门外水声找到协会账本。',
        conflict: '协会会长试图用规则阻断主角继续核验。',
        ending_hook: '账本编号指向医院设备。',
        scene_cards: [
          { scene_no: 1, title: '规则反制', reader_payoff: '目标读者缺口被正文补上。' },
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
      { chapter_no: 32, title: '水声后的账本' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补目标读者')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补读者：目标读者缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('规则反制写成现场行动')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('读者欲望')
    expect(prompt).toContain('补读者：目标读者缺口 2')
    expect(prompt).toContain('旧钥匙缺口给出可感知回报')
  })

  test('carries genre positioning sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 33, chapter_no: 33, title: '医院设备新门槛' },
      [
        { id: 32, chapter_no: 32, title: '报废设备订单' },
        { id: 33, chapter_no: 33, title: '医院设备新门槛' },
      ],
      [
        {
          id: 241,
          chapter_id: 32,
          review_type: 'genre_positioning_sync',
          created_at: '2026-06-09T09:55:00.000Z',
          payload: JSON.stringify({
            chapter_id: 32,
            chapter_no: 32,
            genre_positioning_sync: {
              status: 'warn',
              label: '题材定位缺口 2',
              summary: '正文有 2 项题材定位缺口。',
              missed_count: 2,
              missed: [
                { label: '核心梗', text: '旧城设备师用隐藏工具箱修报废设备的核心梗没有落成正文场景。' },
                { label: '金手指贴合', text: '金手指变成血脉神通，脱离维修职业和设备订单。' },
              ],
              next_actions: [
                '下一章必须补题材定位：回到都市系统逆袭，把隐藏工具箱贴回维修职业，并用医院设备订单兑现强回报。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', genre: '都市系统逆袭', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 33,
        title: '医院设备新门槛',
        summary: '主角用隐藏工具箱处理医院设备订单。',
        conflict: '医院设备故障超过旧城区订单难度，协会会长继续压制授权。',
        ending_hook: '医院设备编号牵出协会账本。',
        scene_cards: [
          { scene_no: 1, title: '医院设备订单', reader_payoff: '题材定位缺口被正文补上。' },
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
      { chapter_no: 33, title: '医院设备新门槛' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补题材定位')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补题材：题材定位缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('隐藏工具箱贴回维修职业')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('核心梗')
    expect(prompt).toContain('补题材：题材定位缺口 2')
    expect(prompt).toContain('医院设备订单兑现强回报')
  })

  test('carries female audience sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 35, chapter_no: 35, title: '她亲自签字' },
      [
        { id: 34, chapter_no: 34, title: '她自己的合同' },
        { id: 35, chapter_no: 35, title: '她亲自签字' },
      ],
      [
        {
          id: 242,
          chapter_id: 34,
          review_type: 'female_audience_sync',
          created_at: '2026-06-09T10:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            female_audience_sync: {
              status: 'warn',
              label: '女频长篇缺口 2',
              summary: '正文有 2 项女频长篇缺口。',
              missed_count: 2,
              missed: [
                { label: '核心原则', text: '女主缺安全感锚点，关键选择由男主安排。' },
                { label: '虐戏剂量', text: '连续只虐，没有反转或糖。' },
              ],
              next_actions: [
                '下一章必须补女频长篇：让女主亲自做决定、亲自签字，并在受委屈后立刻给反转或糖。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '春风不误', genre: '番茄女生现言', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 35,
        title: '她亲自签字',
        summary: '女主拿回合同主动权，亲自签下新条款。',
        conflict: '合作方试图让男主代签，女主拒绝并重谈边界。',
        ending_hook: '新条款背后出现母亲旧案线索。',
        scene_cards: [
          { scene_no: 1, title: '亲自签字', reader_payoff: '女频长篇缺口被正文补上。' },
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
      { chapter_no: 35, title: '她亲自签字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补女频长篇')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补女频：女频长篇缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('女主亲自做决定')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('核心原则')
    expect(prompt).toContain('补女频：女频长篇缺口 2')
    expect(prompt).toContain('受委屈后立刻给反转或糖')
  })

  test('carries plot dynamics sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 37, chapter_no: 37, title: '账本编号' },
      [
        { id: 36, chapter_no: 36, title: '红色阀门' },
        { id: 37, chapter_no: 37, title: '账本编号' },
      ],
      [
        {
          id: 243,
          chapter_id: 36,
          review_type: 'plot_dynamics_sync',
          created_at: '2026-06-09T10:15:00.000Z',
          payload: JSON.stringify({
            chapter_id: 36,
            chapter_no: 36,
            plot_dynamics_sync: {
              status: 'warn',
              label: '剧情动力缺口 2',
              summary: '正文有 2 项剧情动力缺口。',
              missed_count: 2,
              missed: [
                { label: '剧情闭环', text: '红色阀门没有形成目标、阻碍、行动、代价/反馈、新期待闭环。' },
                { label: '高潮公式', text: '缺少假胜、崩解和交叉死磕，高潮直接顺滑结束。' },
              ],
              next_actions: [
                '下一章必须补剧情动力：先给账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 37,
        title: '账本编号',
        summary: '主角追查红色阀门编号背后的协会账本。',
        conflict: '协会会长用医院停机责任逼客户撤回授权。',
        ending_hook: '账本编号对应前一批报废设备。',
        scene_cards: [
          { scene_no: 1, title: '账本编号', reader_payoff: '剧情动力缺口被正文补上。' },
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
      { chapter_no: 37, title: '账本编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补剧情动力')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补动力：剧情动力缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('账本编号目标和协会阻碍')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('剧情闭环')
    expect(prompt).toContain('补动力：剧情动力缺口 2')
    expect(prompt).toContain('主角行动、代价反馈和新的章末期待')
  })

  test('carries character relation sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 38, chapter_no: 38, title: '共同证词' },
      [
        { id: 37, chapter_no: 37, title: '代签追责' },
        { id: 38, chapter_no: 38, title: '共同证词' },
      ],
      [
        {
          id: 244,
          chapter_id: 37,
          review_type: 'character_relation_sync',
          created_at: '2026-06-09T10:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 37,
            chapter_no: 37,
            character_relation_sync: {
              status: 'warn',
              label: '角色关系缺口 2',
              summary: '正文有 2 项角色关系缺口。',
              missed_count: 2,
              missed: [
                { label: '关系弧线', text: '林青禾和主角仍停在互相支持，没有压力测试后的态度变化。' },
                { label: '独立目标', text: '配角只围着主角转，没有洗清代签责任的独立目标。' },
              ],
              next_actions: [
                '下一章必须补角色关系：明确合作互信但仍有边界，让林青禾带着洗清代签责任的独立目标主动作证。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 38,
        title: '共同证词',
        summary: '主角和林青禾在追责会上拆穿代签陷阱。',
        conflict: '协会会长用客户撤授权压两人分开承担责任。',
        ending_hook: '林青禾提交的证词牵出旧设备采购名单。',
        scene_cards: [
          { scene_no: 1, title: '共同证词', reader_payoff: '角色关系缺口被正文补上。' },
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
      { chapter_no: 38, title: '共同证词' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补角色关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补关系线：角色关系缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('合作互信但仍有边界')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('关系弧线')
    expect(prompt).toContain('补关系线：角色关系缺口 2')
    expect(prompt).toContain('洗清代签责任的独立目标主动作证')
  })

  test('carries core contract sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 19, chapter_no: 19, title: '广播室名单' },
      [
        { id: 18, chapter_no: 18, title: '玻璃暗号' },
        { id: 19, chapter_no: 19, title: '广播室名单' },
      ],
      [
        {
          id: 245,
          chapter_id: 18,
          review_type: 'core_contract_sync',
          created_at: '2026-06-09T11:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 18,
            chapter_no: 18,
            core_contract_sync: {
              status: 'warn',
              label: '核心契约缺口 2',
              summary: '正文有 2 项核心契约缺口。',
              missed_count: 2,
              missed: [
                { label: '必须服务', text: '超人蛮力被规则反制没有落成现场判定。' },
                { label: '不得漂移', text: '规则怪谈被写成纯打怪，主角靠蛮力无代价通关。' },
              ],
              next_actions: [
                '下一章必须补核心契约：广播室名单要继续服务规则反制，写出蛮力被判定限制和广播来源新问题。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 19,
        title: '广播室名单',
        summary: '主角追查废弃广播室名单。',
        conflict: '规则判定禁止强拆广播室门。',
        ending_hook: '名单里出现下一位播音者。',
        scene_cards: [
          { scene_no: 1, title: '广播室名单', reader_payoff: '核心契约缺口被正文补上。' },
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
      { chapter_no: 19, title: '广播室名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：核心承诺缺口 2')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('规则反制')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('广播来源新问题')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('广播室名单要继续服务规则反制')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('必须服务')
    expect(prompt).toContain('创作契约：核心承诺缺口 2')
    expect(prompt).toContain('蛮力被判定限制和广播来源新问题')
  })

  test('carries chapter blueprint sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二扇门' },
      [
        { id: 8, chapter_no: 8, title: '第二本账册' },
        { id: 9, chapter_no: 9, title: '第二扇门' },
      ],
      [
        {
          id: 217,
          chapter_id: 8,
          review_type: 'chapter_blueprint_sync',
          created_at: '2026-06-09T08:15:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            chapter_blueprint_sync: {
              status: 'warn',
              label: '细纲缺口 2',
              summary: '正文有 2 项章节细纲任务未充分落地。',
              missed_count: 2,
              missed: [
                { label: '章尾承接', text: '禁地钥匙对应第二扇门，门后有人等江辰' },
                { label: '代价/收益', text: '江辰暴露第二本账册的同时洗清罪名' },
              ],
              next_actions: [
                '下一章必须补足章节细纲 missed 项，把章尾承接和代价收益写成正文可见的新问题与后果。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第二扇门',
        summary: '江辰用禁地钥匙打开第二扇门，接住上一章留下的人影。',
        conflict: '门后的人要求江辰交出第二本账册。',
        ending_hook: '门后阵纹亮起第三个旧印。',
        scene_cards: [
          { scene_no: 1, title: '门后人影', reader_payoff: '细纲缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二扇门' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补细纲')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补细纲：细纲缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('章尾承接')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('代价/收益')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('禁地钥匙对应第二扇门')
    expect(prompt).toContain('补细纲：细纲缺口 2')
    expect(prompt).toContain('江辰暴露第二本账册')
  })

  test('carries foreshadowing delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '旧臣回声' },
      [
        { id: 8, chapter_no: 8, title: '腰牌裂痕' },
        { id: 9, chapter_no: 9, title: '旧臣回声' },
      ],
      [
        {
          id: 218,
          chapter_id: 8,
          review_type: 'foreshadowing_delta_sync',
          created_at: '2026-06-09T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            foreshadowing_delta_sync: {
              status: 'warn',
              label: '伏笔增量缺口 2',
              summary: '本章新增/推进/回收的伏笔有 2 项未写回。',
              missed_count: 2,
              missed: [
                { name: '旧臣背刺伏笔线', text: '旧臣避开腰牌，说明他认识边军暗记。' },
                { name: '暗门钥匙伏笔', text: '门环背面缺口和钥匙齿痕对应。' },
              ],
              next_actions: [
                '下一章只补本轮伏笔增量：把旧臣避开腰牌写成可见反应，并把暗门钥匙状态写回伏笔台账。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '镜州旧案', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '旧臣回声',
        summary: '主角追查腰牌裂痕，确认旧臣与暗门钥匙有关。',
        conflict: '旧臣拒绝承认认识边军暗记。',
        ending_hook: '暗门内传来旧臣年轻时的声音。',
        scene_cards: [
          { scene_no: 1, title: '腰牌复核', reader_payoff: '伏笔增量被正文补回。' },
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
      { chapter_no: 9, title: '旧臣回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补伏笔增量')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补伏笔增量：伏笔增量缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧臣背刺伏笔线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('暗门钥匙伏笔')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章只补本轮伏笔增量')
    expect(prompt).toContain('补伏笔增量：伏笔增量缺口 2')
    expect(prompt).toContain('暗门钥匙状态写回伏笔台账')
  })

  test('carries character state delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '旁听席之后' },
      [
        { id: 8, chapter_no: 8, title: '公开作证' },
        { id: 9, chapter_no: 9, title: '旁听席之后' },
      ],
      [
        {
          id: 219,
          chapter_id: 8,
          review_type: 'character_state_delta_sync',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            character_state_delta_sync: {
              status: 'warn',
              label: '角色状态增量缺口 1',
              summary: '林青禾的关系态度和公众形象没有写回。',
              missed_count: 1,
              missed: [
                { name: '林青禾', text: '关系态度：愿意有限作证；公众形象：仍被家族盯着。' },
              ],
              next_actions: [
                '下一章只补本章角色状态增量：林青禾先保持有限作证立场，并承受家族目光压力。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '旁听席之后',
        summary: '林青禾离开旁听席后被家族逼问，李玄必须判断她还能不能继续作证。',
        conflict: '林青禾想有限作证，但家族压力逼她收回证词。',
        ending_hook: '她递给李玄一枚被折断的旧印章。',
        scene_cards: [
          { scene_no: 1, title: '旁听席外', reader_payoff: '角色状态缺口被正文补回。' },
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
      { chapter_no: 9, title: '旁听席之后' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补角色状态')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补角色状态：角色状态增量缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('林青禾')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证')
    expect(prompt).toContain('补角色状态：角色状态增量缺口 1')
    expect(prompt).toContain('林青禾先保持有限作证立场')
  })

  test('carries asset state delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '旧印半痕' },
      [
        { id: 8, chapter_no: 8, title: '公开作证' },
        { id: 9, chapter_no: 9, title: '旧印半痕' },
      ],
      [
        {
          id: 220,
          chapter_id: 8,
          review_type: 'asset_state_delta_sync',
          created_at: '2026-06-09T08:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            asset_state_delta_sync: {
              status: 'warn',
              label: '资产状态增量缺口 1',
              summary: '旧印章的可见性没有写回。',
              missed_count: 1,
              missed: [
                { name: '旧印章', text: '只露出半枚印纹，不能提前公开完整归属。' },
              ],
              next_actions: [
                '下一章只补本章资产状态增量：旧印章继续保持半枚印纹状态，并用可见限制推动李玄追查。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '旧印半痕',
        summary: '李玄拿着半枚旧印章追查账册来源。',
        conflict: '旧印章只能显出半枚印纹，不能直接证明完整归属。',
        ending_hook: '半枚印纹在月光下补出另一个家族姓氏。',
        scene_cards: [
          { scene_no: 1, title: '半印追查', reader_payoff: '资产状态缺口被正文补回。' },
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
      { chapter_no: 9, title: '旧印半痕' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补资产状态')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补资产状态：资产状态增量缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半枚印纹')
    expect(prompt).toContain('补资产状态：资产状态增量缺口 1')
    expect(prompt).toContain('旧印章继续保持半枚印纹状态')
  })

  test('carries relationship delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '有限作证之后' },
      [
        { id: 8, chapter_no: 8, title: '公开作证' },
        { id: 9, chapter_no: 9, title: '有限作证之后' },
      ],
      [
        {
          id: 221,
          chapter_id: 8,
          review_type: 'relationship_delta_sync',
          created_at: '2026-06-09T08:35:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            relationship_delta_sync: {
              status: 'warn',
              label: '关系增量缺口 1',
              summary: '李玄与林青禾互信线没有写回关系图。',
              missed_count: 1,
              missed: [
                { name: '李玄与林青禾互信线', text: '林青禾从旁观转为有限作证，双方形成有代价的互信。' },
              ],
              next_actions: [
                '下一章只补本章关系增量：林青禾仍保持有限作证，不要突然变成无条件盟友。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '有限作证之后',
        summary: '李玄判断林青禾的证词还能否继续使用。',
        conflict: '林青禾愿意有限作证，但不愿把家族拖进审判。',
        ending_hook: '她把证词改成只保护李玄一次。',
        scene_cards: [
          { scene_no: 1, title: '证词边界', reader_payoff: '关系增量缺口被正文补回。' },
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
      { chapter_no: 9, title: '有限作证之后' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补关系：关系增量缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李玄与林青禾互信线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证')
    expect(prompt).toContain('补关系：关系增量缺口 1')
    expect(prompt).toContain('林青禾仍保持有限作证')
  })

  test('carries chapter handoff delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第三个证人' },
      [
        { id: 8, chapter_no: 8, title: '第二个证人' },
        { id: 9, chapter_no: 9, title: '第三个证人' },
      ],
      [
        {
          id: 222,
          chapter_id: 8,
          review_type: 'chapter_handoff_delta_sync',
          created_at: '2026-06-09T08:40:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            chapter_handoff_delta_sync: {
              status: 'warn',
              label: '章末交接缺口 1',
              summary: '第二个证人的章末追读没有写入下一章优先事项。',
              missed_count: 1,
              missed: [
                { label: '下一章拉力', text: '第二个证人说出旧案当晚还有第三个人。' },
              ],
              next_actions: [
                '下一章开篇必须接住第二个证人的最后一句话，先追查第三个人而不是重开新场景。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第三个证人',
        summary: '李玄追查旧案当晚的第三个人。',
        conflict: '第二个证人只肯说半句，执事试图切断追问。',
        ending_hook: '第三个人的名字出现在旧账册缺页背面。',
        scene_cards: [
          { scene_no: 1, title: '证词追问', reader_payoff: '章末交接缺口被正文补回。' },
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
      { chapter_no: 9, title: '第三个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补章末交接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补章末交接：章末交接缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('第二个证人')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('第三个人')
    expect(prompt).toContain('补章末交接：章末交接缺口 1')
    expect(prompt).toContain('先追查第三个人')
  })

  test('carries chapter handoff sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 22, chapter_no: 22, title: '水痕名单' },
      [
        { id: 21, chapter_no: 21, title: '门外暗号' },
        { id: 22, chapter_no: 22, title: '水痕名单' },
      ],
      [
        {
          id: 246,
          chapter_id: 21,
          review_type: 'chapter_handoff_sync',
          created_at: '2026-06-09T11:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 21,
            chapter_no: 21,
            chapter_handoff_sync: {
              status: 'warn',
              label: '章首承接缺口 2',
              summary: '正文有 2 项章首承接缺口。',
              missed_count: 2,
              missed: [
                { label: '开篇义务', text: '开篇没有接住敲门、湿漉漉学生和不能开门的警告。' },
                { label: '逾期待办', text: '玻璃门水痕没有优先推进。' },
              ],
              next_actions: [
                '下一章必须补章首承接：开篇先回到玻璃门水痕，接住湿漉漉学生和不能开门警告，再推进名单线索。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 22,
        title: '水痕名单',
        summary: '主角追查玻璃门水痕对应的名单。',
        conflict: '规则判定阻止他们直接开门。',
        ending_hook: '名单里出现门外学生的旧床位。',
        scene_cards: [
          { scene_no: 1, title: '水痕名单', reader_payoff: '章首承接缺口被正文补上。' },
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
      { chapter_no: 22, title: '水痕名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补章首承接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('接章首：章首承接缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('开篇先回到玻璃门水痕')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('开篇义务')
    expect(prompt).toContain('接章首：章首承接缺口 2')
    expect(prompt).toContain('接住湿漉漉学生和不能开门警告')
  })

  test('carries prose revision receipt sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '审稿残留复写' },
      [
        { id: 8, chapter_no: 8, title: '修订后的裂缝' },
        { id: 9, chapter_no: 9, title: '审稿残留复写' },
      ],
      [
        {
          id: 223,
          chapter_id: 8,
          review_type: 'prose_revision_receipt_sync',
          created_at: '2026-06-09T08:45:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            prose_revision_receipt_sync: {
              status: 'warn',
              label: '修订回执残留 1',
              summary: '修订后仍有 1 项残留风险。',
              missed_count: 1,
              missed: [
                {
                  label: 'S2｜prose',
                  text: '仍有抽象心理描写，没有改成动作和对白。',
                  evidence: '他心中泛起复杂情绪。',
                },
              ],
              next_actions: [
                '下一章开篇不能复现抽象心理描写，必须用动作、对白和可见反应替代。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '审稿残留复写',
        summary: '李玄继续追查修订后残留的证词漏洞。',
        conflict: '他必须用可见行动逼出新证词，而不是旁白解释心理。',
        ending_hook: '证词背面出现被擦掉的第二行字。',
        scene_cards: [
          { scene_no: 1, title: '证词复核', reader_payoff: '修订残留被正文补回。' },
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
      { chapter_no: 9, title: '审稿残留复写' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先复核修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复核修订：修订回执残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('抽象心理描写')
    expect(prompt).toContain('复核修订：修订回执残留 1')
    expect(prompt).toContain('必须用动作、对白和可见反应替代')
  })

  test('carries revision cascade impact sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '半印追查' },
      [
        { id: 8, chapter_no: 8, title: '修订后的旧印' },
        { id: 9, chapter_no: 9, title: '半印追查' },
      ],
      [
        {
          id: 224,
          chapter_id: 8,
          review_type: 'revision_cascade_impact_sync',
          created_at: '2026-06-09T08:47:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            revision_cascade_impact_sync: {
              status: 'warn',
              label: '修订级联影响 2',
              summary: '本章修订改变了旧印章归属和互信边界，后续章节需要同步。',
              missed_count: 2,
              missed: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  text: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                },
                {
                  type: 'relationship',
                  target: '李玄与林青禾互信线',
                  text: '有限作证仍成立，但不能写成无条件结盟。',
                  required_action: '保持有限作证边界。',
                },
              ],
              next_actions: [
                '下一章必须先同步修订后的资产归属和关系边界，再推进新冲突。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '半印追查',
        summary: '李玄按修订后的旧印章归属继续追查。',
        conflict: '林青禾只能提供半枚印纹，不能直接交出旧印章。',
        ending_hook: '半枚印纹对上账册缺页。',
        scene_cards: [
          { scene_no: 1, title: '半印边界', reader_payoff: '修订级联影响被正文接住。' },
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
      { chapter_no: 9, title: '半印追查' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先级联修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('级联修订：修订级联影响 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('林青禾只递出半枚印纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证边界')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('第9章开篇改为林青禾只递出半枚印纹')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('保持有限作证边界')
    expect(prompt).toContain('级联修订：修订级联影响 2')
    expect(prompt).toContain('开篇动作：')
    expect(prompt).toContain('第9章开篇改为林青禾只递出半枚印纹')
    expect(prompt).toContain('中段动作：')
    expect(prompt).toContain('保持有限作证边界')
    expect(prompt).toContain('开篇动作必须在前300字')
    expect(prompt).toContain('中段动作必须落成中段事件推进')
    expect(prompt).toContain('章末动作必须在最后300字')
    expect(prompt).toContain('先同步修订后的资产归属和关系边界')
  })

  test('carries revision cascade evidence location risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '半印追查' },
      [
        { id: 8, chapter_no: 8, title: '修订后的旧印' },
        { id: 9, chapter_no: 9, title: '半印追查' },
      ],
      [
        {
          id: 225,
          chapter_id: 8,
          review_type: 'revision_cascade_impact_sync',
          created_at: '2026-06-09T08:49:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            revision_cascade_impact_sync: {
              status: 'warn',
              label: '修订级联影响 1',
              summary: '旧印章归属证据来自旧稿，后续章节不能直接沿用。',
              missed_count: 1,
              evidence_unlocated_count: 1,
              missed: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  text: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                  evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
                  evidence_location_risk: 'cascade_impacts evidence/source_excerpt 无法定位到修订后正文。',
                },
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '半印追查',
        summary: '李玄按修订后的旧印章归属继续追查。',
        conflict: '林青禾只能提供半枚印纹，不能直接交出旧印章。',
        ending_hook: '半枚印纹对上账册缺页。',
        scene_cards: [
          { scene_no: 1, title: '半印边界', reader_payoff: '修订级联影响被正文接住。' },
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
      { chapter_no: 9, title: '半印追查' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先级联修订')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('无法定位到修订后正文')
    expect(prompt).toContain('无法定位到修订后正文')
    expect(prompt).toContain('第9章开篇改为林青禾只递出半枚印纹')
  })

  test('carries revision scope guard misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '修订幅度回稳' },
      [
        { id: 8, chapter_no: 8, title: '修订过量的一章' },
        { id: 9, chapter_no: 9, title: '修订幅度回稳' },
      ],
      [
        {
          id: 225,
          chapter_id: 8,
          review_type: 'revision_scope_guard_sync',
          created_at: '2026-06-09T08:49:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            revision_scope_guard_sync: {
              status: 'warn',
              label: '修订幅度过大 1600',
              summary: '修订前后字数差异 1600 字，超过 max(原文 30%, 800 字) 的警戒线 1200 字。',
              missed_count: 1,
              missed: [
                {
                  label: '修订幅度过大',
                  text: '修订缩短 1600 字，超过允许差异 1200 字。',
                  evidence: '原 4000 字；修订后 2400 字；差异 1600 字',
                  fix: '恢复被误删的伏笔、钩子、角色特征、情节推进和必要转折。',
                },
              ],
              next_actions: [
                '下一轮修订不要重写整章；只按自检证据、修订回执残留和确定性检查缺口做局部修复。',
                '先恢复被误删的伏笔、钩子、角色特征、情节推进和必要转折。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '修订幅度回稳',
        summary: '李玄回到旧证词现场，补回上一章修订时被削弱的钩子和必要转折。',
        conflict: '他必须只修证据缺口，不能把整章改成新支线。',
        ending_hook: '被误删的半枚印纹重新指向缺页。',
        scene_cards: [
          { scene_no: 1, title: '局部回稳', reader_payoff: '修订幅度风险被正文接住。' },
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
      { chapter_no: 9, title: '修订幅度回稳' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先稳修订幅度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('稳修订幅度：修订幅度过大 1600')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不要重写整章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('恢复被误删的伏笔')
    expect(prompt).toContain('稳修订幅度：修订幅度过大 1600')
    expect(prompt).toContain('只按自检证据')
  })

  test('carries revision context receipt misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '半印追查' },
      [
        { id: 8, chapter_no: 8, title: '修订后的旧印' },
        { id: 9, chapter_no: 9, title: '半印追查' },
      ],
      [
        {
          id: 226,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:52:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              revision: {
                revision_context_receipts: [
                  {
                    key: 'next_chapter_context',
                    label: '后续章节衔接',
                    status: 'warn',
                    evidence: '修订后把旧印章交给林青禾，但下一章仍按李玄持有旧印章推进。',
                    fix: '下一章开篇必须同步旧印章归属，改成林青禾只递出半枚印纹。',
                  },
                  {
                    key: 'character_cards',
                    label: '角色卡一致性',
                    status: 'fail',
                    evidence: '修订后林青禾无条件结盟，违背角色卡“有限作证”。',
                    fix: '下一章维持有限作证边界，不写成无条件结盟。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '半印追查',
        summary: '李玄按修订上下文继续追查旧印。',
        conflict: '林青禾只能递出半枚印纹，不能被写成无条件结盟。',
        ending_hook: '半枚印纹对上账册缺页。',
        scene_cards: [
          { scene_no: 1, title: '半印边界', reader_payoff: '修订上下文风险被正文接住。' },
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
      { chapter_no: 9, title: '半印追查' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先复核修订上下文')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修订上下文：上下文缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章归属')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半枚印纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证边界')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('修订上下文开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('有限作证边界')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_chapter_context')
    expect(prompt).toContain('修订上下文：上下文缺口 2')
    expect(prompt).toContain('优先复核修订上下文')
    expect(prompt).toContain('不写成无条件结盟')
  })

  test('builds a revision-context receipt sync report from unresolved revision context receipts', () => {
    const report = buildRevisionContextReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '半印追查' },
      {
        revised: true,
        revision: {
          revision_context_receipts: [
            {
              key: 'next_chapter_context',
              label: '后续章节衔接',
              status: 'warn',
              evidence: '修订后把旧印章交给林青禾，但下一章仍按李玄持有旧印章推进。',
              fix: '下一章开篇必须同步旧印章归属，改成林青禾只递出半枚印纹。',
            },
            {
              key: 'timeline',
              label: '时间线',
              status: 'pass',
              evidence: '审判庭复核仍发生在同日夜间。',
              fix: '无需修订，时间线一致。',
              source_excerpt: '审判庭复核仍发生在同日夜间。',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订上下文残留 1')
    expect(report.receipt_count).toBe(2)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'next_chapter_context',
      label: '后续章节衔接',
    })
    expect(report.next_actions.join('｜')).toContain('revision_context_receipts')
  })

  test('keeps revision-context receipt sync open when pass receipts omit required audit fields', () => {
    const report = buildRevisionContextReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '半印追查' },
      {
        revised: true,
        revision: {
          revision_context_receipts: [
            {
              key: 'timeline',
              label: '时间线',
              status: 'pass',
              evidence: '审判庭复核仍发生在同日夜间。',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订上下文残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'timeline',
      label: '时间线',
      status: 'warn',
    })
    expect(report.missed[0].evidence).toContain('缺少字段')
    expect(report.missed[0].evidence).toContain('source_excerpt')
    expect(report.next_actions.join('｜')).toContain('source_excerpt')
  })

  test('carries failed information flow checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '旧印章反推' },
      [
        { id: 6, chapter_no: 6, title: '公开作证' },
        { id: 7, chapter_no: 7, title: '旧印章反推' },
      ],
      [
        {
          id: 215,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                information_flow_checks: [
                  {
                    key: 'unrelated_info_group',
                    label: '无关信息团',
                    status: 'fail',
                    evidence: '主角识破伪证后，正文转去讲反派童年背景，和当前审判没有递进关系。',
                    fix: '下一章把反派背景压缩成伪证动机证据，服务旧印章反推。',
                  },
                  {
                    key: 'transition_gap',
                    label: '场景衔接断裂',
                    status: 'warn',
                    evidence: '第一场留下旧印章悬念，第二场开头却改写闲聊，没有回应悬念。',
                    fix: '下一章开篇必须直接回应旧印章是谁留下的。',
                  },
                  {
                    key: 'unit_summary',
                    label: '信息团可概括',
                    status: 'pass',
                    evidence: '第一场可概括为主角识破伪证。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '旧印章反推',
        summary: '主角把旧印章和伪证动机连起来，逼出第二个证人。',
        conflict: '对手想继续用无关背景拖延审判。',
        ending_hook: '第二个证人从屏风后走出。',
        scene_cards: [
          { scene_no: 1, title: '回应旧印章', reader_payoff: '旧印章指向证人。' },
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
      { chapter_no: 7, title: '旧印章反推' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修信息团衔接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('信息团衔接：信息缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('伪证动机证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章是谁留下的')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('第一场可概括为主角识破伪证')
    expect(prompt).toContain('信息团衔接：信息缺口 2')
    expect(prompt).toContain('反派童年背景')
    expect(prompt).toContain('场景衔接断裂')
  })

  test('carries information flow execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '第二个证人' },
      ],
      [
        {
          id: 216,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                information_flow_checks: [
                  {
                    key: 'withheld_question_not_answered',
                    label: '悬念回应断裂',
                    status: 'fail',
                    reveal_order: '先让证人承认旧印来源，再揭示伪证动机。',
                    withheld_question: '旧印章是谁留下的。',
                    action_bound_release: '主角逼证人按下旧印，信息随动作释放。',
                    conflict_or_cost: '证人承认后会被会长逐出审判席。',
                    evidence: '正文先解释会长童年，再回到旧印章，信息顺序打散。',
                    fix: '下一章第一场直接用按旧印动作回答旧印来源，再把伪证动机压到冲突中释放。',
                    remaining_risk: '不能再用无动作背景段落解释旧印来源。',
                  },
                  {
                    key: 'flow_ok',
                    label: '信息团递进',
                    status: 'pass',
                    reveal_order: '已按动作释放。',
                    withheld_question: '已回应。',
                    action_bound_release: '已兑现。',
                    conflict_or_cost: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '第二个证人',
        summary: '主角用旧印章逼第二个证人承认证词来源。',
        conflict: '会长试图阻止证人按下旧印。',
        ending_hook: '证人的证词指向第三枚旧印。',
        scene_cards: [
          { scene_no: 1, title: '按下旧印', reader_payoff: '信息流缺口被动作释放。' },
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
      { chapter_no: 8, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修信息团衔接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('信息团衔接：信息缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('information_flow_checks.悬念回应断裂')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reveal_order=先让证人承认旧印来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('withheld_question=旧印章是谁留下的')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action_bound_release=主角逼证人按下旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('conflict_or_cost=证人承认后会被会长逐出审判席')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('信息团递进')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('信息团')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('action_bound_release')
    expect(prompt).toContain('information_flow_checks.悬念回应断裂')
    expect(prompt).toContain('不能再用无动作背景段落解释旧印来源')
  })

  test('carries expectation threshold execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第三道资格门槛' },
      [
        { id: 8, chapter_no: 8, title: '第二个证人' },
        { id: 9, chapter_no: 9, title: '第三道资格门槛' },
      ],
      [
        {
          id: 217,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                expectation_threshold_checks: [
                  {
                    key: 'threshold_after_payoff_missing',
                    label: '爽点后没有新门槛',
                    status: 'fail',
                    reader_question: '第三枚旧印到底会把谁拖进审判席。',
                    stakes: '如果新门槛不成立，第二个证人的证词就只剩单章爽点。',
                    choice_pressure: '李玄必须在公开验印和保护证人之间二选一。',
                    payoff_promise: '公开验印会给出父亲线索，但同时暴露证人身份。',
                    next_chapter_pull: '章尾必须把第三枚旧印变成下一章资格门槛。',
                    evidence: '正文让证人承认证词后直接收束，没有提出下一道条件。',
                    fix: '下一章开篇把第三枚旧印设成公开验印资格，中段用二选一压力拖住爽点释放。',
                    remaining_risk: '不能在承认旧印后立刻发放父亲线索，必须先设新门槛。',
                  },
                  {
                    key: 'two_long_one_short_ok',
                    label: '两长一短',
                    status: 'pass',
                    reader_question: '已兑现。',
                    stakes: '已兑现。',
                    choice_pressure: '已兑现。',
                    payoff_promise: '已兑现。',
                    next_chapter_pull: '已兑现。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第三道资格门槛',
        summary: '李玄把第三枚旧印变成公开验印资格。',
        conflict: '公开验印会暴露证人身份。',
        ending_hook: '旧印验明后出现父亲留下的第二层暗记。',
        scene_cards: [
          { scene_no: 1, title: '公开验印', reader_payoff: '期待门槛字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:20:00.000Z',
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
      { chapter_no: 9, title: '第三道资格门槛' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修期待门槛')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('期待门槛：门槛缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expectation_threshold_checks.爽点后没有新门槛')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_question=第三枚旧印到底会把谁拖进审判席')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('stakes=如果新门槛不成立')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('choice_pressure=李玄必须在公开验印和保护证人之间二选一')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('payoff_promise=公开验印会给出父亲线索')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('两长一短')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('期待门槛')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('choice_pressure')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_chapter_pull')
    expect(prompt).toContain('expectation_threshold_checks.爽点后没有新门槛')
    expect(prompt).toContain('不能在承认旧印后立刻发放父亲线索')
  })

  test('carries single-chapter governance recheck misses into the next delivery risk brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 43, chapter_no: 43, title: '复查后的新局' },
      [
        { id: 42, chapter_no: 42, title: '旧证重审' },
        { id: 43, chapter_no: 43, title: '复查后的新局' },
      ],
      [
        {
          id: 301,
          chapter_id: 42,
          review_type: 'governance_recheck_sync',
          created_at: '2026-06-13T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 42,
            chapter_no: 42,
            governance_recheck_sync: {
              status: 'warn',
              label: '恢复依据缺口 2',
              missed_count: 2,
              failed_evidence: ['第42章对白交锋已补回样章节奏'],
              watch_items: ['下一章继续观察样章策略命中率'],
            },
          }),
        },
      ],
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先验恢复依据')
    expect(deliveryRiskCarryOver?.items).toContain('验恢复依据：恢复依据缺口 2')
    expect(deliveryRiskCarryOver?.required_actions.join('｜')).toContain('修复：第42章对白交锋已补回样章节奏')
  })

  test('marks aged reader expectation debt as overdue in context, brief, and prose prompt', () => {
    const debtContext = buildReaderExpectationDebtContext(
      { id: 6, chapter_no: 6, title: '旧债压场' },
      [
        { id: 1, chapter_no: 1, title: '双魂降临' },
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '夜巡脚步' },
        { id: 5, chapter_no: 5, title: '宿舍水痕' },
        { id: 6, chapter_no: 6, title: '旧债压场' },
      ],
      [
        {
          id: 101,
          chapter_id: 2,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            reader_expectation_sync: {
              status: 'warn',
              missed: [
                { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门后消失' },
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
          chapter_no: 6,
          title: '旧债压场',
          summary: '把前面积压的门外学生悬念推进成宿舍规则危机。',
          conflict: '继续守规还是反查广播源头。',
          ending_hook: '广播第一次叫出了李超的真名。',
          scene_cards: [],
        },
      },
    )
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: debtContext,
        chapter_target: {
          chapter_no: 6,
          title: '旧债压场',
          summary: '把前面积压的门外学生悬念推进成宿舍规则危机。',
          conflict: '继续守规还是反查广播源头。',
          ending_hook: '广播第一次叫出了李超的真名。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 6, title: '旧债压场' },
    )

    expect(debtContext.must_carry[0].age_chapters).toBe(4)
    expect(debtContext.must_carry[0].overdue).toBe(true)
    expect(debtContext.keep_alive[0].overdue).toBe(true)
    expect(debtContext.overdue_count).toBe(2)
    expect(debtContext.overdue.map((item: any) => item.text).join('｜')).toContain('湿漉漉学生')
    expect(brief.reader_expectation_debt.overdue_count).toBe(2)
    expect(brief.reader_expectation_debt.summary).toContain('逾期 2 项')
    expect(prompt).toContain('逾期待补')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门后消失')
  })

  test('adds storyline advances, plants, payoffs, and forbidden items to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '旧规则失效',
          summary: '林晓旧经验失效，张智发现新规则漏洞。',
          conflict: '继续相信旧守则还是冒险验证第零条规则。',
          ending_hook: '第零条规则第一次显形。',
          word_target: { target: 3000, rangeText: '标准章 2800-3500字' },
          scene_cards: [],
        },
        storyline_context: {
          required: ['规则之源调查', '林晓求生支线'],
          forbidden: ['编织者真名'],
          chapter_usage: [
            { usage_type: 'advance', name: '规则之源调查', expected_state_change: { next: '获得第一块真相拼图' } },
            { usage_type: 'plant', name: '第零条规则回收线', expected_state_change: { clue: '守则页脚异常' } },
            { usage_type: 'payoff', name: '林晓求生支线', expected_state_change: { payoff: '证明林晓两天经验不完整' } },
            { usage_type: 'forbidden', name: '编织者真名', expected_state_change: { forbidden: '不可揭露幕后外神身份' } },
          ],
        },
      },
    )

    expect(brief.storyline_advances).toContain('规则之源调查')
    expect(brief.storyline_advances).toContain('林晓求生支线')
    expect(brief.storyline_plants).toContain('第零条规则回收线')
    expect(brief.storyline_payoffs).toContain('林晓求生支线')
    expect(brief.storyline_forbidden).toContain('编织者真名')
  })

  test('adds character growth obligations to the pre-draft brief and prose context', () => {
    const characterArcEntity = {
      id: 701,
      entity_type: 'character_arc',
      name: '李玄藏拙到公开争取',
      summary: '李玄从害怕暴露残阵，转向主动承认缺陷并争取试炼资格。',
      constraints_json: {
        forbidden_reveal: '不得提前写成彻底公开身份。',
      },
      state_json: {
        current_state: '仍在藏拙，但已经被执事逼到边缘。',
        last_advanced_chapter: 4,
        next_advance_chapter: 8,
      },
      payload_json: {
        related_characters: ['李玄'],
        desire: '保住试炼资格并证明阵图属于自己',
        flaw_pressure: '害怕暴露残阵裂纹，只想继续藏拙',
        growth_target: '第一次主动承认残阵缺陷，把藏拙改成公开争取',
        voice_anchor: '克制、冷静，但遇到阵法归属寸步不让',
      },
    }
    const relationshipArcEntity = {
      id: 702,
      entity_type: 'relationship_arc',
      name: '李玄与林青禾互信线',
      summary: '林青禾从旁观者转为愿意替李玄作证。',
      constraints_json: {
        forbidden_reveal: '不得提前写成完全信任。',
      },
      state_json: {
        current_state: '林青禾仍在观察李玄。',
        next_advance_chapter: 8,
      },
      payload_json: {
        related_characters: ['李玄', '林青禾'],
        relationship_shift: '林青禾从旁观转为愿意替他作证',
      },
    }
    const brief = buildChapterPreDraftBrief(
      { title: '残阵问道' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄在试炼前夜被迫公开残阵缺陷。',
          conflict: '执事逼他交出阵图，林青禾必须决定是否作证。',
          ending_hook: '残阵亮起第二道裂纹。',
          scene_cards: [],
        },
        setting_context: {
          entities: [characterArcEntity, relationshipArcEntity],
          chapter_usage: [
            { entity_id: 701, usage_type: 'advance', expected_state_change: { growth_beat: '主动承认残阵缺陷' } },
            { entity_id: 702, usage_type: 'advance', expected_state_change: { relationship_shift: '林青禾第一次公开作证' } },
          ],
        },
      },
    )
    const confirmedAt = '2026-06-10T09:00:00.000Z'
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      { ...brief, confirmed_at: confirmedAt },
    )
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '残阵问道' },
      context,
      null,
      { chapter_no: 8, title: '试炼前夜' },
    )

    expect(brief.character_arc_brief.desire).toContain('保住试炼资格')
    expect(brief.character_arc_brief.flaw_pressure).toContain('继续藏拙')
    expect(brief.character_arc_brief.growth_beat).toContain('公开争取')
    expect(brief.character_arc_brief.relationship_shift).toContain('公开作证')
    expect(brief.character_arc_brief.voice_anchor).toContain('寸步不让')
    expect(brief.character_arc_brief.forbidden_reveal).toContain('完全信任')
    expect(brief.character_arc_brief.arcs.map((item: any) => item.name)).toContain('李玄藏拙到公开争取')
    expect(context.chapter_target.character_arc_brief.growth_beat).toContain('公开争取')
    expect(prompt).toContain('【人物成长承接】')
    expect(prompt).toContain('主动承认残阵缺陷')
    expect(prompt).toContain('不得只在旁白里说人物成长')
  })

  test('adds longform compass boundaries to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          axes: [
            { key: 'core_conflict', label: '核心矛盾', value: '蛮力不能直接碾压规则。' },
            { key: 'payoff_loop', label: '长期爽点循环', value: '每章一次规则发现或力量反制。' },
          ],
          immutable_rules: ['超人力量不能无代价碾压规则', '双主角互补不能拆散'],
          flexible_zones: ['副本题材可换，但必须服务规则破局主线'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [{ scene_no: 1, title: '门槛', reader_payoff: '规则边界第一次显形。' }],
        },
      },
    )

    expect(brief.longform_compass.reader_promise).toContain('规则判定')
    expect(brief.longform_compass.immutable_rules).toContain('超人力量不能无代价碾压规则')
    expect(brief.longform_compass.flexible_zones).toContain('副本题材可换，但必须服务规则破局主线')
    expect(brief.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('蛮力')
  })

  test('adds camelCase chapter longform compass boundaries to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [{ scene_no: 1, title: '门槛', reader_payoff: '规则边界第一次显形。' }],
          longformCompass: {
            readerPromise: '超人力量必须持续撞上规则判定。',
            coreConflict: '蛮力破局与规则边界互相反制。',
            immutableRules: ['超人力量不能变成无代价清场'],
            flexibleZones: ['副本可变化，但必须服务规则破局主线'],
          },
        },
      },
    )

    expect(brief.longform_compass.reader_promise).toContain('规则判定')
    expect(brief.longform_compass.immutable_rules).toContain('超人力量不能变成无代价清场')
    expect(brief.longform_compass.flexible_zones).toContain('副本可变化，但必须服务规则破局主线')
    expect(brief.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('规则边界')
  })

  test('merges runtime chapterTarget longform compass into pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [{ scene_no: 1, title: '门槛', reader_payoff: '规则边界第一次显形。' }],
        },
        chapterTarget: {
          chapterNo: 2,
          longformCompass: {
            readerPromise: '超人力量必须持续撞上规则判定。',
            coreConflict: '蛮力破局与规则边界互相反制。',
            immutableRules: ['超人力量不能变成无代价清场'],
            flexibleZones: ['副本可变化，但必须服务规则破局主线'],
          },
        },
      },
    )

    expect(brief.longform_compass.reader_promise).toContain('规则判定')
    expect(brief.longform_compass.immutable_rules).toContain('超人力量不能变成无代价清场')
    expect(brief.longform_compass.flexible_zones).toContain('副本可变化，但必须服务规则破局主线')
    expect(brief.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('规则边界')
  })

  test('adds core contract radar to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            promise: '超人力量和规则判定持续碰撞。',
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          core_conflict: '蛮力破局与规则判定的对抗。',
          innovation_hook: '超人能力被规则空间反制。',
          core_emotion: '力量被规则反制后的紧张与破局爽。',
          immutable_rules: ['不能把规则怪谈写成纯打怪', '双主角互补不能拆散'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '验证十点门槛的规则边界。',
          conflict: '李超想硬闯，张智要求低成本验证。',
          chapter_launch_gate: {
            reader_promise: { status: 'warn', reason: '超人力量与规则判定碰撞不够可见' },
            mainline_service: { status: 'block', reason: '本章必须推进午夜校园规则调查' },
          },
          scene_cards: [
            { scene_no: 1, title: '十点门槛', reader_payoff: '超人力量第一次被规则边界反制。' },
          ],
        },
      },
    )

    expect(brief.core_contract_radar.summary).toContain('超人力量')
    expect(brief.core_contract_radar.must_serve).toContain('超人力量和规则判定持续碰撞。')
    expect(brief.core_contract_radar.must_serve).toContain('蛮力破局与规则判定的对抗。')
    expect(brief.core_contract_radar.must_serve).toContain('超人能力被规则空间反制。')
    expect(brief.core_contract_radar.must_serve).toContain('超人力量第一次被规则边界反制。')
    expect(brief.core_contract_radar.no_drift).toContain('不能把规则怪谈写成纯打怪')
    expect(brief.core_contract_radar.theme_unity_rules.join('｜')).toContain('一本书从头到尾要有统一的核心情绪')
    expect(brief.core_contract_radar.theme_unity_rules.join('｜')).toContain('小情绪服从大情绪')
    expect(brief.core_contract_radar.theme_unity_rules.join('｜')).toContain('随机翻开一章')
    expect(brief.core_contract_radar.theme_unity_rules.join('｜')).toContain('力量被规则反制后的紧张与破局爽')
    expect(brief.core_contract_radar.selling_point_execution_rules.join('｜')).toContain('卖点四步法')
    expect(brief.core_contract_radar.selling_point_execution_rules.join('｜')).toContain('发现比告知爽十倍')
    expect(brief.core_contract_radar.selling_point_execution_rules.join('｜')).toContain('开头暗示')
    expect(brief.core_contract_radar.repetition_strategy_rules.join('｜')).toContain('重复点')
    expect(brief.core_contract_radar.repetition_strategy_rules.join('｜')).toContain('同一卖点至少延展 3 个角度')
    expect(brief.core_contract_radar.commercial_rhythm_rules.join('｜')).toContain('连续 2 章没有目标推进、阻碍升级或新信息')
    expect(brief.core_contract_radar.commercial_rhythm_rules.join('｜')).toContain('大高潮 7-10 天')
    expect(brief.core_contract_radar.goldfinger_structure_rules.join('｜')).toContain('金手指可替换故事流程中的任一环节')
    expect(brief.core_contract_radar.goldfinger_structure_rules.join('｜')).toContain('一眼就懂')
    expect(brief.core_contract_radar.launch_pressure_rules.join('｜')).toContain('300-500字内交代处境、危险来源和破局希望')
    expect(brief.core_contract_radar.launch_pressure_rules.join('｜')).toContain('优先用环境型压力开局')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('theme_unity')
    expect(brief.core_contract_radar.repair_focus.join('｜')).toContain('本章必须推进午夜校园规则调查')
    expect(brief.core_contract_radar.checks.map((check: any) => check.label)).toContain('主线服务')
  })

  test('uses camelCase chapter launch gate when building core contract radar', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            promise: '超人力量和规则判定持续碰撞。',
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          core_conflict: '蛮力破局与规则判定的对抗。',
          immutable_rules: ['不能把规则怪谈写成纯打怪'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '验证十点门槛的规则边界。',
          conflict: '李超想硬闯，张智要求低成本验证。',
          chapterLaunchGate: {
            reader_promise: { status: 'warn', reason: '超人力量与规则判定碰撞不够可见' },
            mainline_service: { status: 'block', reason: '本章必须推进午夜校园规则调查' },
          },
          scene_cards: [
            { scene_no: 1, title: '十点门槛', reader_payoff: '超人力量第一次被规则边界反制。' },
          ],
        },
      },
    )

    expect(brief.core_contract_radar.repair_focus.join('｜')).toContain('本章必须推进午夜校园规则调查')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('mainline_service')
  })

  test('merges runtime chapterTarget chapterLaunchGate into core contract radar when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            promise: '超人力量和规则判定持续碰撞。',
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          core_conflict: '蛮力破局与规则判定的对抗。',
          immutable_rules: ['不能把规则怪谈写成纯打怪'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '验证十点门槛的规则边界。',
          scene_cards: [
            { scene_no: 1, title: '十点门槛', reader_payoff: '超人力量第一次被规则边界反制。' },
          ],
        },
        chapterTarget: {
          chapterNo: 2,
          chapterLaunchGate: {
            mainline_service: { status: 'block', reason: '本章必须推进午夜校园规则调查' },
          },
        },
      },
    )

    expect(brief.core_contract_radar.repair_focus.join('｜')).toContain('本章必须推进午夜校园规则调查')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('mainline_service')
  })

  test('merges runtime chapterTarget coreContractRadar into pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [
            { scene_no: 1, title: '十点门槛', reader_payoff: '超人力量第一次被规则边界反制。' },
          ],
        },
        chapterTarget: {
          chapterNo: 2,
          coreContractRadar: {
            summary: '本章必须沿用运行时核心契约。',
            mustServe: ['运行时核心承诺必须进入任务书'],
            noDrift: ['不能把运行时契约降级成默认推导'],
            repairFocus: ['优先补运行时指定的主线推进'],
            checks: [{ key: 'runtime_contract', label: '运行时契约' }],
          },
        },
      },
    )

    expect(brief.core_contract_radar.summary).toContain('运行时核心契约')
    expect(brief.core_contract_radar.must_serve).toContain('运行时核心承诺必须进入任务书')
    expect(brief.core_contract_radar.no_drift).toContain('不能把运行时契约降级成默认推导')
    expect(brief.core_contract_radar.repair_focus).toContain('优先补运行时指定的主线推进')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('runtime_contract')
  })

  test('adds ten-chapter core selling point drift check to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            promise: '超人力量和规则判定持续碰撞。',
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          axes: [
            { key: 'innovation_hook', label: '创新卖点', value: '超人能力被规则空间反制。' },
            { key: 'payoff_loop', label: '爽点循环', value: '每十章仍要让力量反制规则。' },
          ],
          immutable_rules: ['不能把规则怪谈写成纯打怪'],
        },
        chapter_target: {
          chapter_no: 10,
          title: '第十条规则',
          summary: '第十章复核最初吸引读者的卖点是否还在。',
          scene_cards: [
            { scene_no: 1, title: '规则反噬', reader_payoff: '超人能力被规则空间再次反制。' },
          ],
        },
      },
    )

    expect(brief.core_contract_radar.periodic_drift_check).toEqual(expect.objectContaining({
      cadence: '每10章',
      due: true,
    }))
    expect(brief.core_contract_radar.periodic_drift_check.question).toContain('当初吸引读者的卖点还在吗')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('ten_chapter_selling_point')
  })

  test('turns creation contracts into a pre-write confirmation checklist', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '灰域双生',
        genre: '都市规则怪谈',
        target_audience: '18-30 岁番茄男频读者',
        synopsis: '双主角用武力试错和规则推演反制怪谈。',
        reference_config: {
          writing_bible: {
            promise: '每章都有规则发现、代价压力和反制爽点。',
            target_reader_contract: {
              source: 'oh_story_creation_contract_v1',
              reader_profile: '18-30 岁番茄男频规则怪谈读者',
              reader_desires: ['规则破解爽点', '双主角互补反制'],
              emotional_gap: ['缺掌控感，需要看到规则被拆解'],
              chapter_value_test: ['写给谁看', '读者想看什么', '本章给什么'],
            },
            genre_positioning_contract: {
              source: 'oh_story_creation_contract_v1',
              genre_tags: ['都市规则怪谈', '双主角'],
              platform: '番茄',
              selling_points: ['莽夫破局制造反差', '规则分析带来智斗爽感'],
              long_board: '规则破解爽点',
              innovation_boundary: '不能把规则怪谈写成纯打怪。',
            },
            core_contract_radar: {
              source: 'oh_story_creation_contract_v1',
              must_serve: ['每章都有规则发现、代价压力和反制爽点。'],
              no_drift: ['不能写成纯打怪'],
              repair_focus: ['本章必须把规则发现写成现场证据'],
            },
            reader_retention_contract: {
              source: 'oh_story_creation_contract_v1',
              opening_hook_rule: '前300字承接上一章规则代价。',
              ending_hook_rule: '章末留下下一章动作压力。',
              quality_checks: ['开头不能另起炉灶'],
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '验证十点门槛的规则边界。',
          conflict: '林野想硬闯，沈砚要求低成本验证。',
          ending_hook: '门外的第二条规则响起。',
          scene_cards: [
            { scene_no: 1, title: '十点门槛', conflict: '硬闯会触发代价', reader_payoff: '规则边界第一次显形。' },
          ],
        },
      },
    )

    expect(brief.target_reader_contract.reader_profile).toContain('18-30')
    expect(brief.target_reader_contract.reader_desires.join('｜')).toContain('规则破解爽点')
    expect(brief.genre_positioning_contract.genre_tags.join('｜')).toContain('都市规则怪谈')
    expect(brief.core_contract_radar.must_serve.join('｜')).toContain('每章都有规则发现')
    expect(brief.reader_retention_brief.opening_hook).toContain('前300字')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('目标读者')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('题材定位')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('特殊题材')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('核心承诺')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('追读留存')
    expect(brief.write_preparation_brief.must_confirm.join('｜')).toContain('创作契约：目标读者')
  })

  test('turns creation opening hook strategy into opening contract and prose prompt', () => {
    const project = {
      title: '灰域双生',
      genre: '都市规则怪谈',
      target_audience: '18-30 岁番茄男频读者',
      synopsis: '双主角用武力试错和规则推演反制怪谈。',
      reference_config: {
        writing_bible: {
          opening_strategy_contract: {
            source: 'oh_story_opening_hook_strategy_v1',
            hook_type: '事件噱头',
            opening_flow: '事件切入5章后嫁接主线。',
            mainline_graft: '第五章把规则副本嫁接到校园主线。',
            first_5_chapter_promise: ['第一章立刻进入十点门槛事件。'],
            threshold_ladder: ['十点门槛', '姓名门槛'],
            forbidden_mixing: ['事件噱头和金手指噱头不能混用。'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '十点门槛',
        summary: '第一章直接进入十点规则事件。',
        conflict: '林野想硬闯，沈砚要求先验证规则。',
        ending_hook: '门外响起第二条规则。',
        scene_cards: [
          { scene_no: 1, title: '门槛倒计时', conflict: '十点前必须判断能否开门。' },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 1, title: '十点门槛' })

    expect(brief.opening_contract.source).toBe('oh_story_opening_hook_strategy_v1')
    expect(brief.opening_contract.hook_type).toBe('事件噱头')
    expect(brief.opening_contract.opening_strategy).toContain('事件切入5章后嫁接主线')
    expect(brief.opening_contract.mainline_graft).toContain('校园主线')
    expect(brief.opening_contract.threshold_ladder).toContain('十点门槛')
    expect(brief.opening_contract.forbidden_patterns.join('｜')).toContain('不能混用')
    expect(prompt).toContain('事件噱头')
    expect(prompt).toContain('第五章把规则副本嫁接到校园主线')
    expect(prompt).toContain('十点门槛')
  })

  test('adds longform battle desk risks to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        longformBattleDesk: {
          status: 'needs_action',
          score: 72,
          summary: '先修复读者拉力和核心守恒，再进入正文。',
          riskChips: ['核心偏移', '前30章留存'],
          primaryAction: {
            key: 'run_first30_retention',
            label: '运行前30章诊断',
            reason: '第2章章末钩子弱，必须补读者期待。',
          },
          lanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              score: 68,
              detail: '核心偏移：超人力量被写成普通无敌碾压。',
              action: '本章必须写出规则判定反制蛮力。',
            },
            {
              key: 'reader_pull',
              label: '读者拉力',
              status: 'block',
              score: 55,
              detail: '前30章留存弱：开篇钩子和章末追读不足。',
              action: '前300字给危机，章末留下门外学生悬念。',
            },
            {
              key: 'innovation_ip',
              label: '创新/IP场面',
              status: 'ok',
              score: 86,
              detail: '十点门槛具备可视化场面。',
            },
          ],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [],
        },
      },
    )

    expect(brief.longform_battle_context.status).toBe('needs_action')
    expect(brief.longform_battle_context.risk_chips).toContain('核心偏移')
    expect(brief.longform_battle_context.primary_action.label).toBe('运行前30章诊断')
    expect(brief.longform_battle_context.risk_lanes.map((lane: any) => lane.key)).toEqual(['story_core', 'reader_pull'])
    expect(brief.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定反制蛮力')
    expect(brief.longform_battle_context.lanes.find((lane: any) => lane.key === 'innovation_ip')?.detail).toContain('十点门槛')
  })

  test('adds camelCase chapter longform battle context to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [],
          longformBattleContext: {
            status: 'needs_action',
            summary: '本章必须把长篇核心拉回规则反制。',
            riskChips: ['核心漂移', '读者拉力弱'],
            primaryAction: {
              key: 'repair_story_core',
              label: '修复核心守恒',
              reason: '正文必须让超人力量被规则判定反制。',
            },
            riskLanes: [
              {
                key: 'story_core',
                label: '核心守恒',
                status: 'warn',
                detail: '核心漂移：超人力量像普通无敌流。',
                requiredAction: '写出规则判定压住蛮力的现场代价。',
              },
            ],
          },
        },
      },
    )

    expect(brief.longform_battle_context.summary).toContain('长篇核心拉回规则反制')
    expect(brief.longform_battle_context.risk_chips).toContain('核心漂移')
    expect(brief.longform_battle_context.primary_action.label).toBe('修复核心守恒')
    expect(brief.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定压住蛮力')
  })

  test('merges runtime chapterTarget longform battle context into the pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 2,
          longformBattleContext: {
            status: 'needs_action',
            summary: '运行时长篇作战台要求先修复章末追读。',
            riskChips: ['运行时作战台'],
            riskLanes: [
              {
                key: 'reader_pull',
                label: '读者拉力',
                status: 'block',
                detail: '章末问题太快关闭。',
                requiredAction: '章末必须留下湿漉漉学生身份悬念。',
              },
            ],
          },
        },
      },
    )

    expect(brief.longform_battle_context.summary).toContain('运行时长篇作战台')
    expect(brief.longform_battle_context.risk_chips).toContain('运行时作战台')
    expect(brief.longform_battle_context.risk_lanes[0].required_action).toContain('湿漉漉学生身份悬念')
  })

  test('adds chapter innovation execution to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            innovation_hook: '超人力量不能碾压规则，必须用规则漏洞反制。',
            commercial_positioning: {
              selling_points: ['超人蛮力撞上规则判定', '智者拆规则反杀'],
            },
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          axes: [
            { key: 'innovation_hook', label: '创新卖点', value: '超人不是无敌爽，而是每次强行动手都会被规则反噬。' },
            { key: 'world_hook', label: '世界奇点', value: '每个副本都是可验证的规则系统。' },
          ],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '十点门槛第一次显形。',
          conflict: '李超想硬闯，张智要求先验证边界。',
          scene_cards: [
            {
              scene_no: 1,
              title: '十点门槛',
              reader_payoff: '用饼干碎屑验证黑暗清除规则。',
              rule_pressure: '十点后不得离开宿舍。',
              reversal: '超人力量无法越过判定边界。',
            },
          ],
        },
      },
    )

    expect(brief.innovation_brief.chapter_angle).toContain('规则反噬')
    expect(brief.innovation_brief.execution_points).toContain('用饼干碎屑验证黑暗清除规则')
    expect(brief.innovation_brief.differentiation_guardrails).toContain('不得写成普通开挂碾压')
    expect(brief.innovation_brief.ip_adaptation_hooks).toContain('十点门槛')
  })

  test('adds rolling-plan signature scene repair obligations to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 9,
          title: '新压力源',
          summary: '安全区被迫变成临时战场。',
          conflict: '旧秩序压制新晋黑马。',
          ending_hook: '道具背面刻着禁用标记。',
          rollingPlan: {
            signature_scene: '主角在倒塌走廊里反手点亮禁用阵纹，把安全区变成审判场。',
            scene_repair_target: '修复 IP场面覆盖 1/10 的强场面空窗。',
            reader_payoff: '规则反杀爽点。',
            storyline_service: '推进外门试炼主线。',
          },
          scene_cards: [],
        },
      },
    )

    expect(brief.signature_scene_brief.signature_scene).toContain('审判场')
    expect(brief.signature_scene_brief.scene_repair_target).toContain('IP场面覆盖 1/10')
    expect(brief.signature_scene_brief.reader_payoff).toContain('规则反杀')
    expect(brief.signature_scene_brief.storyline_service).toContain('外门试炼主线')
  })

  test('merges runtime chapterTarget signature scene repair into the pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 9,
          title: '新压力源',
          summary: '安全区被迫变成临时战场。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 9,
          rollingPlan: {
            signature_scene: '运行时要求把倒塌走廊写成审判场。',
            scene_repair_target: '补回强场面空窗。',
            reader_payoff: '规则反杀爽点。',
            storyline_service: '推进外门试炼主线。',
          },
        },
      },
    )

    expect(brief.signature_scene_brief.signature_scene).toContain('运行时要求把倒塌走廊写成审判场')
    expect(brief.signature_scene_brief.scene_repair_target).toContain('强场面空窗')
    expect(brief.signature_scene_brief.storyline_service).toContain('外门试炼主线')
  })

  test('adds next batch serial brief to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapterRangeLabel: '第8-10章',
          batchGoal: '三章内进入内门视野。',
          readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
          mainlineFocus: '外门危机 -> 内门招揽',
          forbiddenBoundary: '第10章前不得揭露规则源头。',
          startChecklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
            { key: 'forbidden_boundary', label: '禁写边界', status: 'ok', detail: '第10章前不得揭露规则源头。' },
          ],
          chapters: [
            { chapterNo: 8, title: '外门夜钟', chapterTask: '证明夜钟规则有效。', conflict: '是否相信敌人提示。', endingHook: '钟声倒数。' },
            { chapterNo: 9, title: '反制试探', chapterTask: '用超人速度验证边界。', conflict: '速度能否绕过规则。', endingHook: '内门令牌出现。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
      },
    )

    expect(brief.next_batch_brief.chapter_range_label).toBe('第8-10章')
    expect(brief.next_batch_brief.batch_goal).toContain('内门视野')
    expect(brief.next_batch_brief.reader_payoff_plan).toContain('打脸')
    expect(brief.next_batch_brief.current_chapter_role).toContain('证明夜钟规则有效')
    expect(brief.next_batch_brief.forbidden_boundary).toContain('规则源头')
    expect(brief.next_batch_brief.start_checklist.map((item: any) => item.key)).toEqual(['core_promise', 'forbidden_boundary'])
    expect(brief.next_batch_brief.start_checklist[0].detail).toContain('规则反制')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('继续/续写/日更只表示继续当前日更批量流程')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('确定本轮写作范围后直接进入 Step 2')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('story-explorer')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('context_load')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('返回不完整')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('回退到手动加载')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/上下文.md 缺失时从 追踪/伏笔.md + 追踪/时间线.md 重建')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/伏笔.md 缺失可跳过')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/时间线.md 缺失可从正文推断')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('大纲/细纲_第{N}章.md 缺失必须先补建')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('确定下一章编号 N')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/上下文.md 的“最后完成章节”')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('扫描 正文/ 目录中编号最大的章节 +1')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('K 默认 2-3 章')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('只写1章')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('从细纲中提取本章涉及的角色名')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按需加载 设定/角色/{角色名}.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('细纲未列出角色时跳过')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Step 2.1 标题预检')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('同名或明显重复')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按本章核心事件改名')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('同步细纲标题与正文文件名')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得跳过 Step 2.2 状态筛选或 Step 2.3 文风召回')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('必须串行逐章写作，不得并发生成多章')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('章间不重复询问是否继续')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('细纲缺失')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('用户要求改变大纲/追踪')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('细纲缺失补建流程')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('设定/角色/{角色名}.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按新版细纲模板补齐内容概括、情节安排、人物关系/出场顺序、情节细化、结尾设定')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('无法确认字段写 [待补充]')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不杜撰')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('每章写完立即更新')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/上下文.md 只更新进度元信息')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不写详细角色状态/伏笔内容')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('超过30章时')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('已写内容摘要按三层结构')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('压缩早期章节、保留近期细节')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('近5章详记、十章概要、卷级总览')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('每50章或卷结束')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/归档')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('活跃伏笔、时间线、角色状态仍以当前文件为准')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('批量写作模式跳过单章 story-review lean')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('全部写完后再统一执行 Phase 5 质量检查')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Phase 5 完整检查清单')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('禁用词扫描、标题去重检查、正文元信息扫描和章尾钩子检查')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('命中时必须回对应正文或细纲修复')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Phase 5 对照细纲核对')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('新版细纲核对内容概括五段式、情节安排多线、人物关系变化/出场顺序、代价兑现/收益兑现')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('旧版细纲只核对核心事件、目标情绪、章首/章尾钩子和字数目标')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('伏笔盘点仅本轮增量')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('本批新增/推进/回收的伏笔已写入追踪/伏笔.md并更新状态')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('确定性收尾')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('主会话在本批实际落盘正文上运行 normalize-punctuation.js')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('check-ai-patterns.js --check')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('narrative-writer agent 不运行这些脚本')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('本轮 workflow 内实际读取或刚更新')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得用未标明来源的聊天记忆替代')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('首次日更兜底')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪文件全部为空或不存在')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('大纲/卷纲_当前卷.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('最新一章正文')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('重建上下文')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('新版细纲优先读取内容概括、情节安排、人物关系和出场顺序')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('旧版细纲缺这些字段不阻塞')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('回退到核心事件、目标情绪、章首/章尾钩子和字数目标')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('新版细纲进入意图确认时')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('内容概括决定起承转合')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('人物关系和出场顺序决定镜头进入顺序')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('情节细化决定代价兑现/收益兑现')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Step 2.4 craft')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Step 2.3 对标召回')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('剧情/情绪模块.md、剧情/节奏.md、文风.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('情绪模块/节奏参照优先')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('文风.md 只管表达层')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('对标缺口分流')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('missing_primary_contract/profile_missing')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得进入 narrative-writer')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('legacy_deconstruction')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('module_missing/rhythm_missing')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('matched_deep_dive_missing')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得在后续报告中反转为 false')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('无 story-explorer 时降级')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('手动按对标书路径查找')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('先读 剧情/情绪模块.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('grep 章节/*_摘要.md 的「基调」')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('第1-3章_深度拆解.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('v12 停止修复，legacy 才回退继续')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('资料研究按需')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('story-researcher')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('参考资料/')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('研究完成后再继续写作')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得编造确定事实')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('字数验证')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('优先 Python 字符统计')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('wc -m 仅作 Unix 备选')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('低于目标 90%')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('强制扩充')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('gaps/conflict 必须进入意图确认')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得用文风接近掩盖模块或节奏缺失')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('爽点出手前先铺可指认的危机/期待')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不铺=空洞')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('在场配角放大成差异化反应')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('信息型配角不当科普嘴')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按需加载创作公式')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('references/genre-writing-formulas.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('期待感公式、爽点公式、信息差公式')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('默认不加载')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('避免无条件加载 1500+ 行文件')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('批次最终进度摘要')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('## 写作进度')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('最后完成章节')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('本期完成')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('## 当前状态')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('下一章细纲状态')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('注意事项')
  })

  test('merges runtime chapterTarget next batch brief into the pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 8,
          nextBatchBrief: {
            chapterRangeLabel: '第8-10章',
            batchGoal: '运行时要求三章内完成外门到内门视野切换。',
            forbiddenBoundary: '第10章前不得揭露规则源头。',
            startChecklist: [
              { key: 'reader_payoff', label: '读者回报', status: 'ok', detail: '每章都要有规则反制爽点。' },
            ],
            chapters: [
              { chapterNo: 8, title: '外门夜钟', chapterTask: '本章只验证夜钟规则第一次显形。' },
            ],
          },
        },
      },
    )

    expect(brief.next_batch_brief.batch_goal).toContain('运行时要求三章内完成')
    expect(brief.next_batch_brief.current_chapter_role).toContain('本章只验证夜钟规则第一次显形')
    expect(brief.next_batch_brief.start_checklist[0].detail).toContain('规则反制爽点')
  })

  test('carries camelCase next batch brief through pre-draft brief confirmation', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        nextBatchBrief: {
          chapterRangeLabel: '第8-10章',
          batchGoal: '三章内进入内门视野。',
          readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
          mainlineFocus: '外门危机 -> 内门招揽',
          forbiddenBoundary: '第10章前不得揭露规则源头。',
          startChecklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
          ],
          chapters: [
            { chapterNo: 8, title: '外门夜钟', chapterTask: '证明夜钟规则有效。', conflict: '是否相信敌人提示。', endingHook: '钟声倒数。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
      },
    )
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        ...brief,
        confirmed_at: '2026-06-10T08:00:00.000Z',
      },
    )

    expect(brief.next_batch_brief.chapter_range_label).toBe('第8-10章')
    expect(brief.next_batch_brief.current_chapter_role).toContain('证明夜钟规则有效')
    expect(context.chapter_target.next_batch_brief.batch_goal).toContain('内门视野')
    expect(context.next_batch_brief.start_checklist[0].detail).toContain('规则反制')
  })

  test('adds longform memory capsule to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '万古长夜' },
      {
        longform_memory_capsule: {
          last_updated_chapter: 7,
          core_promise: '寒门少年以阵法改写宗门秩序。',
          mainline_progress: '外门压迫线推进到试炼前夜。',
          character_states: ['李玄：仍在藏拙，但已经被执事逼到试炼边缘'],
          open_questions: ['残阵缺口为什么会回应旧案禁制'],
          payoff_debts: ['试炼资格被夺后的公开打脸回报'],
          canon_facts: ['残阵缺口不能被普通阵图修复'],
          red_lines: ['主角不能脱离阵法成长线'],
        },
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          scene_cards: [],
        },
      },
    )

    expect(brief.longform_memory_capsule.core_promise).toContain('寒门少年')
    expect(brief.longform_memory_capsule.mainline_progress).toContain('试炼前夜')
    expect(brief.longform_memory_capsule.character_states[0]).toContain('李玄')
    expect(brief.longform_memory_capsule.open_questions).toContain('残阵缺口为什么会回应旧案禁制')
    expect(brief.longform_memory_capsule.payoff_debts).toContain('试炼资格被夺后的公开打脸回报')
    expect(brief.longform_memory_capsule.red_lines).toContain('主角不能脱离阵法成长线')
  })

  test('normalizes camelCase longform memory capsule item states in pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '万古长夜' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          scene_cards: [],
          longformMemoryCapsule: {
            corePromise: '寒门少年以阵法改写宗门秩序。',
            characterStates: [
              { name: '李玄', currentState: '右手阵纹失控，仍被迫藏拙', lastUpdatedChapter: 7 },
            ],
            openQuestions: [
              { name: '旧案禁制', currentState: '残阵缺口为什么会回应旧案禁制', lastUpdatedChapter: 7 },
            ],
            redLines: ['主角不能脱离阵法成长线'],
          },
        },
      },
    )

    expect(brief.longform_memory_capsule.core_promise).toContain('寒门少年')
    expect(brief.longform_memory_capsule.character_states).toContain('李玄：右手阵纹失控，仍被迫藏拙@第7章')
    expect(brief.longform_memory_capsule.open_questions).toContain('旧案禁制：残阵缺口为什么会回应旧案禁制@第7章')
  })

  test('adds oh-story layered memory context to the pre-draft brief and prose prompt', () => {
    const project = { title: '万古长夜', reference_config: {} }
    const contextPackage = {
      layered_memory_context: {
        recent_chapter_details: [
          { chapter_no: 46, summary: '李玄进入旧阵塔，发现残阵会吞掉灵识。', state_changes: ['右手阵纹失控'], foreshadowing: ['旧塔第七层有人影'] },
          { chapter_no: 47, summary: '林青禾有限作证，李玄拿到半枚旧印纹。', state_changes: ['互信仍有边界'], foreshadowing: ['半枚旧印纹'] },
        ],
        ten_chapter_summaries: [
          { range: '第41-50章', core_events: '旧案线从外门审问推进到旧阵塔。', character_state_changes: '李玄从被动自证转为主动追查旧印。' },
        ],
        volume_overview: [
          { volume: '第二卷·旧案回声', mainline_progress: '旧印章、残阵缺口和林家旧案开始合流。', turning_point: '林青禾从旁观者转成有限作证者。' },
        ],
        red_lines: ['不得把林青禾写成无条件盟友', '旧印章完整归属不能提前公开'],
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        conflict: '林青禾只能有限作证，旧印归属仍不能公开。',
        scene_cards: [],
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
      { chapter_no: 51, title: '第七层旧影' },
    )

    expect(brief.layered_memory_context.recent_chapter_details[0]).toContain('第46章')
    expect(brief.layered_memory_context.recent_chapter_details[0]).toContain('旧阵塔')
    expect(brief.layered_memory_context.ten_chapter_summaries[0]).toContain('第41-50章')
    expect(brief.layered_memory_context.volume_overview[0]).toContain('第二卷')
    expect(context.chapter_target.layered_memory_context.red_lines).toContain('不得把林青禾写成无条件盟友')
    expect(prompt).toContain('【长篇分层记忆】')
    expect(prompt).toContain('近5章详记')
    expect(prompt).toContain('十章概要')
    expect(prompt).toContain('卷级总览')
    expect(prompt).toContain('旧印章完整归属不能提前公开')
  })

  test('applies oh-story layered memory archive policy to pre-draft brief and prose prompt', () => {
    const project = { title: '万古长夜', reference_config: {} }
    const contextPackage = {
      layered_memory_context: {
        recent_chapter_details: [
          { chapter_no: 44, summary: '旧案外门审问开场。' },
          { chapter_no: 45, summary: '李玄第一次触碰旧印纹。' },
          { chapter_no: 46, summary: '旧阵塔入口打开。' },
          { chapter_no: 47, summary: '林青禾有限作证。' },
          { chapter_no: 48, summary: '半枚旧印纹被确认。' },
          { chapter_no: 49, summary: '残阵缺口回应旧塔禁制。' },
          { chapter_no: 50, summary: '第七层门影出现。' },
        ],
        ten_chapter_summaries: [
          { range: '第41-50章', core_events: '旧案线进入旧阵塔。' },
        ],
        archive_index: [
          { range: '第1-40章', path: '追踪/归档/第001-040章.md', summary: '外门压迫线和旧案前史已压缩归档。' },
        ],
        red_lines: ['旧印章完整归属不能提前公开'],
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 51, title: '第七层旧影' })

    expect(brief.layered_memory_context.recent_chapter_details).toHaveLength(5)
    expect(brief.layered_memory_context.recent_chapter_details.join('｜')).not.toContain('第44章')
    expect(brief.layered_memory_context.recent_chapter_details.join('｜')).not.toContain('第45章')
    expect(brief.layered_memory_context.recent_chapter_details.join('｜')).toContain('第50章')
    expect(context.chapter_target.layered_memory_context.archive_refs[0]).toContain('追踪/归档/第001-040章.md')
    expect(prompt).toContain('归档索引')
    expect(prompt).toContain('第1-40章')
    expect(prompt).toContain('外门压迫线和旧案前史已压缩归档')
  })

  test('carries oh-story daily progress summary into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          progress_summary: {
            last_completed_chapter: 50,
            completed_chapter_count: 1,
            completed_word_count: 3280,
            active_foreshadowing_count: 3,
            recent_changed_characters: ['李玄', '林青禾'],
            next_outline_status: '已有',
            notes: ['旧印章归属仍不能公开', '第51章先接旧阵塔第七层入口'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 51, title: '第七层旧影' })

    expect(brief.progress_summary.last_completed_chapter).toBe(50)
    expect(brief.progress_summary.active_foreshadowing_count).toBe(3)
    expect(context.chapter_target.progress_summary.notes).toContain('旧印章归属仍不能公开')
    expect(prompt).toContain('【日更进度断点】')
    expect(prompt).toContain('最后完成章节：第50章')
    expect(prompt).toContain('活跃伏笔：3条')
    expect(prompt).toContain('第51章先接旧阵塔第七层入口')
  })

  test('carries oh-story daily context snapshot into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          daily_context_snapshot: {
            current_chapter: 50,
            current_scene: '第七层门影刚露出，李玄停在旧阵塔门前。',
            current_emotion_target: '压迫后的短冷和新疑问',
            writing_changes: ['半枚旧印纹会回应旧影', '林青禾仍只能有限作证'],
            pending_clues: ['第七层门影是谁', '旧印章完整归属不能提前公开'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 51, title: '第七层旧影' })

    expect(brief.daily_context_snapshot.current_chapter).toBe(50)
    expect(brief.daily_context_snapshot.current_scene).toContain('第七层门影')
    expect(context.chapter_target.daily_context_snapshot.pending_clues).toContain('第七层门影是谁')
    expect(context.pre_draft_brief.daily_context_snapshot.writing_changes).toContain('半枚旧印纹会回应旧影')
    expect(prompt).toContain('【日更上下文快照】')
    expect(prompt).toContain('当前位置/章：第50章')
    expect(prompt).toContain('当前位置/场景：第七层门影刚露出')
    expect(prompt).toContain('当前位置/情绪目标：压迫后的短冷和新疑问')
    expect(prompt).toContain('本次写作变更：半枚旧印纹会回应旧影')
    expect(prompt).toContain('待处理线索：第七层门影是谁')
  })

  test('director budget omits longform structure contract content from prose prompt snapshot', () => {
    const project = { title: '万古长夜' }
    const contextPackage = {
      oh_story_director: {
        stage: 'draft_prose',
        readiness: 'ready',
        primary_action: {
          key: 'write_chapter_prose',
          label: '生成章节正文',
        },
        blocking_summary: '无阻塞，按预算执行选用合同。',
        selected_contracts: [
          {
            key: 'story_power',
            reason: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
            detail_level: 'full',
          },
        ],
        suppressed_contracts: [
          {
            key: 'longform_structure_contract',
            reason: '本章只需列名，不带入长合同正文。',
            detail_level: 'omit',
          },
        ],
        prompt_budget_plan: {
          full: ['story_power'],
          compact: ['chapter_blueprint'],
          reference: ['continuity'],
          omit: ['longform_structure_contract'],
        },
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        conflict: '旧阵塔门前出现反制。',
        ending_hook: '门影主动回应。',
        longform_structure_contract: {
          note: '开局埋因XYZ_LONGFORM_SHOULD_BE_OMITTED',
        },
        story_power_contract: {
          execution: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧塔门前',
            purpose: '承接上一章钩子。',
            conflict: '门影不让李玄靠近。',
          },
        ],
      },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(project, contextPackage, null, { chapter_no: 51, title: '第七层旧影' })

    expect(prompt).toContain('【oh-story 总导演】')
    expect(prompt).toContain('story_power')
    expect(prompt).toContain('目标阻碍动作反馈XYZ_STORY_POWER_SELECTED')
    expect(prompt).toContain('longform_structure_contract')
    expect(prompt).toContain('omit')
    expect(prompt).not.toContain('XYZ_LONGFORM_SHOULD_BE_OMITTED')
  })

  test('director budget keeps longform structure contract content when not omitted from prose prompt snapshot', () => {
    const project = { title: '万古长夜' }
    const contextPackage = {
      oh_story_director: {
        stage: 'draft_prose',
        readiness: 'ready',
        primary_action: {
          key: 'write_chapter_prose',
          label: '生成章节正文',
        },
        selected_contracts: [
          {
            key: 'story_power',
            reason: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
            detail_level: 'full',
          },
        ],
        suppressed_contracts: [],
        prompt_budget_plan: {
          full: ['story_power'],
          compact: ['longform_structure_contract'],
          reference: [],
          omit: [],
        },
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        conflict: '旧阵塔门前出现反制。',
        ending_hook: '门影主动回应。',
        longform_structure_contract: {
          note: '开局埋因XYZ_LONGFORM_SHOULD_BE_INCLUDED',
        },
        story_power_contract: {
          execution: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧塔门前',
            purpose: '承接上一章钩子。',
            conflict: '门影不让李玄靠近。',
          },
        ],
      },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(project, contextPackage, null, { chapter_no: 51, title: '第七层旧影' })

    expect(prompt).toContain('【oh-story 总导演】')
    expect(prompt).toContain('目标阻碍动作反馈XYZ_STORY_POWER_SELECTED')
    expect(prompt).toContain('XYZ_LONGFORM_SHOULD_BE_INCLUDED')
  })

  test('carries oh-story foreshadowing consistency radar into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          foreshadowing_status: {
            旧印章完整归属: {
              status: 'active',
              planted_chapter: 1,
              last_touched_chapter: 20,
              planned_payoff_chapter: 60,
              note: '旧印章完整归属不能提前公开，只能先验证半枚旧印纹。',
            },
            第七层门影是谁: {
              status: 'active',
              planted_chapter: 50,
              last_touched_chapter: 50,
              note: '第51章只推进身份轮廓。',
            },
            已回收旧门牌: {
              status: 'paid',
              planted_chapter: 12,
              payoff_chapter: 18,
              note: '已经回收，不再作为债务。',
            },
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 52,
        title: '旧印回声',
        summary: '李玄继续验证旧印章和第七层门影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 52, title: '旧印回声' })

    expect(brief.foreshadowing_consistency_radar.overdue_count).toBe(1)
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('旧印章完整归属')
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('已延迟51章')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('第七层门影是谁')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).not.toContain('已回收旧门牌')
    expect(brief.foreshadowing_consistency_radar.scope_rules.join('｜')).toContain('只确认本轮新增/推进/回收的伏笔')
    expect(brief.foreshadowing_consistency_radar.scope_rules.join('｜')).toContain('不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(brief.foreshadowing_consistency_radar.scope_rules.join('｜')).toContain('/story-review')
    expect(context.chapter_target.foreshadowing_consistency_radar.overdue_count).toBe(1)
    expect(prompt).toContain('【伏笔一致性雷达】')
    expect(prompt).toContain('日更范围：只确认本轮新增/推进/回收的伏笔')
    expect(prompt).toContain('不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(prompt).toContain('全量伏笔审计只在 /story-review')
    expect(prompt).toContain('超期伏笔')
    expect(prompt).toContain('旧印章完整归属')
    expect(prompt).toContain('计划回收：第60章')
    expect(prompt).toContain('旧印章完整归属不能提前公开')
  })

  test('carries oh-story foreshadowing status semantics into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          foreshadowing_status: {
            血契真正代价: {
              status: '未埋',
              planned_payoff_chapter: 60,
              note: '只在本卷规划中存在，正文尚未正式埋下。',
            },
            第七层门影是谁: {
              status: '已埋',
              planted_chapter: 40,
              last_touched_chapter: 41,
              note: '已经用门影和旧印回声埋下，下一章只推进一层身份轮廓。',
            },
            已回收旧门牌: {
              status: '已回收',
              planted_chapter: 12,
              payoff_chapter: 18,
              note: '已经在第18章回收，不应再报警。',
            },
            错过血契窗口: {
              status: '已过期',
              planted_chapter: 36,
              planned_payoff_chapter: 41,
              note: '错过原定回收窗口，需要 story-review 或显式修复。',
            },
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 42,
        title: '旧印回声',
        summary: '李玄继续验证旧印章和第七层门影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 42, title: '旧印回声' })

    expect(brief.foreshadowing_consistency_radar.overdue_count).toBe(1)
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('错过血契窗口')
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('状态：已过期')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('血契真正代价')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('状态：未埋')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('第七层门影是谁')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('状态：已埋')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).not.toContain('已回收旧门牌')
    expect(brief.foreshadowing_consistency_radar.status_rules.join('｜')).toContain('未埋、已埋、已回收属于正常状态')
    expect(brief.foreshadowing_consistency_radar.status_rules.join('｜')).toContain('只有已过期需要 /story-review 或显式修复')
    expect(brief.foreshadowing_consistency_radar.status_rules.join('｜')).toContain('SessionStart 不应因未埋、已埋或已回收报警')
    expect(prompt).toContain('伏笔状态语义')
    expect(prompt).toContain('未埋、已埋、已回收属于正常状态')
    expect(prompt).toContain('只有已过期需要 /story-review 或显式修复')
    expect(prompt).toContain('SessionStart 不应因未埋、已埋或已回收报警')
  })

  test('carries oh-story foreshadowing density warnings into the next pre-draft brief and prose prompt', () => {
    const foreshadowingStatus = Object.fromEntries(
      Array.from({ length: 16 }, (_, index) => [
        `第三卷暗线${index + 1}`,
        {
          status: 'active',
          planted_chapter: 41 + index,
          volume_no: 3,
          note: `第三卷暗线${index + 1}仍待推进。`,
        },
      ]),
    )
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          foreshadowing_status: foreshadowingStatus,
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 58,
        title: '暗线过密',
        summary: '李玄进入第三卷密集伏笔段。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 58, title: '暗线过密' })

    expect(brief.foreshadowing_consistency_radar.active_count).toBe(16)
    expect(brief.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('SC-FORESHADOW')
    expect(brief.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('第3卷')
    expect(brief.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('太密')
    expect(context.chapter_target.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('16条')
    expect(prompt).toContain('伏笔密度提醒')
    expect(prompt).toContain('SC-FORESHADOW')
    expect(prompt).toContain('第3卷活跃伏笔16条')
  })

  test('injects story-state style fingerprint as a prose prompt handoff anchor', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          style_fingerprint: '文风指纹：目标句长带 20-42 字，旧上下文已锁定，中长句呼吸为主。',
          style_fingerprint_contract: {
            target_sentence_band: '20-42字',
            policy: '每章写前按文风指纹确定句长节奏，不以可能已漂移的上一章句式节奏为准。',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
      },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, contextPackage, null, { chapter_no: 51, title: '第七层旧影' })

    expect(prompt).toContain('【文风指纹断点】')
    expect(prompt).toContain('目标句长带：20-42字')
    expect(prompt).toContain('旧上下文已锁定')
    expect(prompt).toContain('不以可能已漂移的上一章句式节奏为准')
  })

  test('adds story unit context to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        story_unit_context: {
          title: '试炼前夜剧情单元',
          chapter_range_label: '第7-12章',
          current_chapter_role: '入口钩子',
          unit_goal: '六章内完成外门试炼前夜事件包。',
          entry_hook: '第7章以试炼倒计时开场。',
          pressure_escalation: ['执事设局', '试炼规则反噬'],
          mini_climax_payoff: '第10章公开打脸执事。',
          setup_and_storyline: ['阵盘第二道裂纹埋线', '外门压迫主线阶段兑现'],
          exit_hook: '第12章内门长老亲自点名。',
          forbidden_advance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          scene_cards: [],
        },
      },
    )

    expect(brief.story_unit_context.title).toBe('试炼前夜剧情单元')
    expect(brief.story_unit_context.current_chapter_role).toBe('入口钩子')
    expect(brief.story_unit_context.unit_goal).toContain('外门试炼前夜')
    expect(brief.story_unit_context.pressure_escalation).toContain('执事设局')
    expect(brief.story_unit_context.mini_climax_payoff).toContain('公开打脸')
    expect(brief.story_unit_context.forbidden_advance).toContain('不得提前解决内门招揽条件')
  })

  test('carries camelCase story unit context through pre-draft brief confirmation', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        storyUnitContext: {
          title: '试炼前夜剧情单元',
          chapterRangeLabel: '第7-12章',
          currentChapterRole: '压力升级/推进',
          unitGoal: '六章内完成外门试炼前夜事件包。',
          pressureEscalation: ['执事设局'],
          setupAndStoryline: ['阵盘第二道裂纹埋线'],
          miniClimaxPayoff: '第10章公开打脸执事。',
          exitHook: '第12章内门长老亲自点名。',
          forbiddenAdvance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          scene_cards: [],
        },
      },
    )
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        ...brief,
        confirmed_at: '2026-06-10T08:00:00.000Z',
      },
    )

    expect(brief.story_unit_context.title).toBe('试炼前夜剧情单元')
    expect(brief.story_unit_context.current_chapter_role).toBe('压力升级/推进')
    expect(context.chapter_target.story_unit_context.current_chapter_role).toBe('压力升级/推进')
    expect(context.story_unit_context.forbidden_advance).toContain('不得提前解决内门招揽条件')
  })

  test('merges a confirmed pre-draft brief into chapter generation context', () => {
    const confirmedAt = '2026-06-03T10:00:00.000Z'
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '守则初读',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_goal: '读懂宿舍守则并发现第零条规则。',
        reader_promise: '用智力拆规则，给读者一次反转。',
        core_conflict: '是否相信林晓提供的旧规则。',
        emotional_curve: '紧张 -> 试探 -> 惊疑',
        key_settings: ['宿舍守则'],
        forbidden_content: ['幕后主神'],
        scene_briefs: [{ scene_no: 1, title: '守则册', reader_payoff: '发现漏洞' }],
        storyline_advances: ['规则之源调查'],
        storyline_plants: ['第零条规则回收线'],
        storyline_payoffs: ['林晓求生支线'],
        storyline_forbidden: ['编织者真名'],
        meme_strategy: {
          intensity: '轻度',
          allowed_functions: ['主角吐槽', '规则怪谈弹幕感'],
          forbidden_usage: ['死亡场景不玩梗'],
        },
        reader_retention_brief: {
          opening_hook: '第一段直接落在十点门槛判定。',
          payoff_promise: '让读者看到蛮力被规则反制。',
          information_gap: '门外学生为什么能在规则时间后出现。',
          emotional_reward: '紧张后给一次智者识破规则的回报。',
          short_drama_scene: '玻璃门内外对峙，黑暗贴着门槛爬动。',
          ending_question: '湿漉漉学生到底是求救者还是规则诱饵。',
          forbidden_cliches: ['不要用长篇背景解释替代现场危机'],
        },
        reader_expectation_ledger: {
          chapter_promise: '本章必须让读者看到蛮力被规则反制。',
          must_deliver: [
            { key: 'payoff_promise', label: '爽点承诺', type: 'payoff', text: '让读者看到蛮力被规则反制。' },
            { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生到底是求救者还是规则诱饵。' },
          ],
          keep_alive: [
            { key: 'open_question_1', label: '保留悬念', type: 'question', text: '广播是谁发出的。' },
          ],
          must_not_break: ['不能整章只铺设定不兑现规则反制'],
        },
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          immutable_rules: ['超人力量不能无代价碾压规则'],
          flexible_zones: ['副本题材可换，但必须服务规则破局主线'],
        },
        innovation_brief: {
          chapter_angle: '超人硬闯被规则边界反噬。',
          execution_points: ['用饼干碎屑验证门槛清除规则'],
          differentiation_guardrails: ['不得写成普通开挂碾压'],
          ip_adaptation_hooks: ['玻璃门内外对峙'],
        },
        longform_battle_context: {
          status: 'needs_action',
          summary: '先修复核心守恒。',
          risk_chips: ['核心偏移'],
          primary_action: { key: 'open_quality_revision', label: '进入质检修订', reason: '核心矛盾要回到规则判定反制。' },
          risk_lanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              score: 68,
              detail: '核心偏移：超人力量被写成普通无敌碾压。',
              required_action: '本章必须写出规则判定反制蛮力。',
            },
          ],
        },
        next_batch_brief: {
          chapter_range_label: '第2-4章',
          batch_goal: '三章内完成午夜校园第一轮规则试探。',
          reader_payoff_plan: '每章一次规则显形或力量反制。',
          mainline_focus: '规则初识 -> 规则漏洞',
          forbidden_boundary: '不得提前揭露规则源头。',
          current_chapter_role: '本章负责读懂宿舍守则。',
        },
        story_unit_context: {
          title: '午夜校园第一轮规则试探剧情单元',
          chapter_range_label: '第2-6章',
          current_chapter_role: '压力升级/推进',
          unit_goal: '五章内完成第一条规则的验证、误判和小回收。',
          mini_climax_payoff: '第5章让李超用规则漏洞反制宿管。',
          exit_hook: '第6章第零条规则显形。',
          forbidden_advance: ['不得提前揭露广播源头'],
        },
        longform_memory_capsule: {
          core_promise: '超人力量和规则判定持续碰撞。',
          character_states: ['李超：力量觉醒但不懂规则'],
          open_questions: ['广播是谁发出的'],
          payoff_debts: ['规则边界反制蛮力'],
          red_lines: ['超人力量不能无代价碾压规则'],
        },
        word_budget: '标准章 3000 字',
        ending_hook: '镜子里出现第四个人。',
        confirmed_at: confirmedAt,
      },
    )

    expect(context.pre_draft_brief.confirmed_at).toBe(confirmedAt)
    expect(context.chapter_target.summary).toContain('读懂宿舍守则')
    expect(context.chapter_target.conflict).toContain('林晓')
    expect(context.chapter_target.ending_hook).toContain('镜子')
    expect(context.chapter_target.reader_promise).toContain('反转')
    expect(context.chapter_target.scene_cards[0].reader_payoff).toContain('漏洞')
    expect(context.chapter_target.storyline_advances).toContain('规则之源调查')
    expect(context.chapter_target.storyline_plants).toContain('第零条规则回收线')
    expect(context.chapter_target.storyline_payoffs).toContain('林晓求生支线')
    expect(context.chapter_target.storyline_forbidden).toContain('编织者真名')
    expect(context.chapter_target.meme_strategy.allowed_functions).toContain('主角吐槽')
    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('十点门槛')
    expect(context.chapter_target.reader_retention_brief.payoff_promise).toContain('蛮力')
    expect(context.chapter_target.reader_retention_brief.short_drama_scene).toContain('玻璃门')
    expect(context.chapter_target.reader_expectation_ledger.must_deliver[0].text).toContain('蛮力被规则反制')
    expect(context.chapter_target.reader_expectation_ledger.keep_alive[0].text).toContain('广播')
    expect(context.chapter_target.longform_compass.immutable_rules).toContain('超人力量不能无代价碾压规则')
    expect(context.longform_compass.reader_promise).toContain('规则判定')
    expect(context.chapter_target.longform_battle_context.risk_chips).toContain('核心偏移')
    expect(context.chapter_target.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定反制蛮力')
    expect(context.longform_battle_context.primary_action.label).toBe('进入质检修订')
    expect(context.chapter_target.innovation_brief.chapter_angle).toContain('规则边界反噬')
    expect(context.chapter_target.innovation_brief.execution_points).toContain('用饼干碎屑验证门槛清除规则')
    expect(context.chapter_target.next_batch_brief.current_chapter_role).toContain('读懂宿舍守则')
    expect(context.next_batch_brief.batch_goal).toContain('第一轮规则试探')
    expect(context.chapter_target.story_unit_context.current_chapter_role).toContain('压力升级')
    expect(context.chapter_target.story_unit_context.mini_climax_payoff).toContain('反制宿管')
    expect(context.story_unit_context.title).toContain('午夜校园')
    expect(context.chapter_target.longform_memory_capsule.character_states[0]).toContain('李超')
    expect(context.longform_memory_capsule.open_questions).toContain('广播是谁发出的')
  })

  test('merges camelCase confirmed style sample strategy into downstream prose contracts', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 19,
          title: '雨巷旧证',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 19,
        chapter_goal: '李玄用雨巷旧证逼执事露出换证破绽。',
        core_conflict: '执事连续压问，旁观弟子开始倒向他。',
        chapterBlueprint: {
          targetEmotion: '压迫后信息差反杀',
          contentOutline: {
            cause: '执事抢先定义证词。',
            development: '李玄发现雨巷旧证和袖口旧印对应。',
            turn: '林青禾顶住压力说出旧证来源。',
            climax: '李玄当众反证执事换证。',
            ending: '旧证背面出现内门编号。',
          },
          plotLines: {
            logicLine: '旧证 -> 袖口旧印 -> 换证破绽',
          },
          characterOrder: ['执事', '林青禾', '李玄'],
          costAndReward: '代价：林青禾公开得罪执事；收益：李玄夺回解释权。',
        },
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮证据，爆发后短冷却接章尾钩子',
          styleProfileSummary: '短句推进审讯压力，对白留半拍。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
          styleDirectives: ['对白短促，动作承接情绪余波'],
          samples: [{ sample_key: '雨巷审讯样章', unsafe_direct_phrases: ['样章原句不能照搬'] }],
          doNotCopy: ['不得复制雨巷样章桥段'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.style_sample_strategy.selectedEmotionModule).toContain('信息差反杀')
    expect(context.chapter_target.benchmark_recall_brief.rhythm_reference).toContain('三轮压问')
    expect(context.chapter_target.benchmark_recall_brief.matched_chapter_techniques).toContain('半拍亮证据')
    expect(context.chapter_target.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('不得复制雨巷样章桥段')
    expect(context.chapter_target.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('样章原句不能照搬')
    expect(context.chapter_target.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(context.chapter_target.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('半拍亮证据')
  })

  test('keeps confirmed pre-draft gates in top-level pre_draft_brief for downstream repairs', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 19,
          title: '雨巷旧证',
          summary: '旧目标',
          scene_cards: [
            {
              title: '雨巷审讯',
              purpose: '李玄顶住三轮压问，半拍亮出旧证。',
              conflict: '执事抢先定义旧证为伪证。',
              reader_payoff: '旧证反杀，执事失去话语权。',
            },
          ],
        },
      },
      {
        chapter_no: 19,
        chapter_goal: '李玄用雨巷旧证逼执事露出换证破绽。',
        core_conflict: '执事连续压问，旁观弟子开始倒向他。',
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮证据，爆发后短冷却接章尾钩子',
          styleProfileSummary: '短句推进审讯压力，对白留半拍。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
          styleDirectives: ['对白短促，动作承接情绪余波'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(context.pre_draft_brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(context.pre_draft_brief.write_preparation_brief.execution_order.join('｜')).toContain('Step 2.2 状态筛选')
    expect(context.pre_draft_brief.style_sample_strategy.selectedEmotionModule || context.pre_draft_brief.style_sample_strategy.selected_emotion_module).toContain('信息差反杀')
    expect(context.preDraftBrief).toBe(context.pre_draft_brief)
  })

  test('merges camelCase confirmed signature scene brief into prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 20,
          title: '旧证审判',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 20,
        chapter_goal: '李玄把旧证缺页变成当众审判会长的铁证。',
        signatureSceneBrief: {
          signatureScene: '雨巷长案前，李玄把带血旧证拍进烛火阴影里，满堂执事同时失声。',
          sceneRepairTarget: '补足本章可截图传播的审判场面。',
          readerPayoff: '证据反杀，会长第一次失去话语权。',
          storylineService: '推进旧证换人主线并把矛头指向禁库。',
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 20, title: '旧证审判' },
    )

    expect(context.chapter_target.signature_scene_brief.signature_scene).toContain('雨巷长案')
    expect(context.chapter_target.signature_scene_brief.scene_repair_target).toContain('可截图传播')
    expect(prompt).toContain('【本章标志性场面补位】')
    expect(prompt).toContain('雨巷长案前')
    expect(prompt).toContain('必须把 signature_scene 写成正文核心场面')
  })

  test('preserves runtime camelCase chapterTarget when confirming pre-draft brief', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapterTarget: {
          chapterNo: 21,
          title: '旧证追问',
          summary: '李玄继续追问旧证缺页。',
          conflict: '执事试图把缺页解释成抄录错误。',
          endingHook: '缺页背面露出会长私印。',
          readerRetentionBrief: {
            openingHook: '开篇先让会长私印差点被烧掉。',
            payoffPromise: '李玄用旧证缺页反压执事。',
            endingQuestion: '会长私印为什么出现在缺页背面。',
          },
          sceneCards: [],
        },
      },
      {
        chapter_no: 21,
        chapter_goal: '李玄把旧证缺页继续推进到会长私印。',
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 21, title: '旧证追问' },
    )

    expect(context.chapter_target.chapterNo).toBe(21)
    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('会长私印差点被烧掉')
    expect(context.chapter_target.reader_retention_brief.ending_question).toContain('会长私印为什么')
    expect(prompt).toContain('开篇先让会长私印差点被烧掉')
    expect(prompt).toContain('会长私印为什么出现在缺页背面')
  })

  test('merges camelCase confirmed reader retention brief into rhythm and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 21,
          title: '门槛旧影',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 21,
        chapter_goal: '李玄在雨巷门槛处验证旧影规则。',
        readerRetentionBrief: {
          openingHook: '第一段直接落在雨巷门槛旧影回头。',
          payoffPromise: '读者看到李玄用旧证反制执事。',
          informationGap: '旧影为什么只在门槛内回头。',
          emotionalReward: '压迫后给一次证据反杀的爽感。',
          shortDramaScene: '雨巷门槛内外对峙，烛火把旧影压成两半。',
          endingQuestion: '旧影回头后指向的禁库门牌是谁留下的。',
          retentionPillars: {
            upgrade: '李玄拿到禁库门牌权限。',
            resourcePressure: '旧证缺页只能换一次开门机会。',
            goalStack: '大目标 + 小目标 + 假目标：查禁库，先过雨巷门槛。',
            mysteryUnlock: '旧影为什么只在门槛内回头。',
          },
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 21, title: '门槛旧影' },
    )

    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('雨巷门槛')
    expect(context.chapter_target.reader_retention_brief.ending_question).toContain('禁库门牌')
    expect(context.chapter_target.reader_retention_brief.retention_pillars.goal_stack).toContain('大目标 + 小目标 + 假目标')
    expect(context.chapter_target.serial_rhythm_brief.opening_hook_deadline).toContain('雨巷门槛')
    expect(context.chapter_target.serial_rhythm_brief.ending_hook_guardrail).toContain('禁库门牌')
    expect(prompt).toContain('执行 chapter_target.reader_retention_brief')
    expect(prompt).toContain('留存四大支柱')
    expect(prompt).toContain('升级、资源困境、目标、解密')
    expect(prompt).toContain('第一段直接落在雨巷门槛旧影回头')
    expect(prompt).toContain('旧影回头后指向的禁库门牌')
  })

  test('normalizes existing camelCase reader drop risk brief during confirmed merge', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 22,
          title: '雨巷迟疑',
          summary: '旧目标',
          scene_cards: [],
          readerDropRiskBrief: {
            dropPoints: ['开篇三百字没有现场危险，读者会以为只是复盘。'],
            pullPoints: ['门槛旧影回头时立刻给出未解问题。'],
            repairActions: ['开篇直接写旧影拦门，中段用证据推进，章末留下禁库门牌。'],
            openingGuardrail: '前 300 字必须让旧影拦门并压出危险。',
            middleGuardrail: '中段必须用旧证推进，而不是解释设定。',
            endingGuardrail: '章末必须留下禁库门牌问题。',
          },
        },
      },
      {
        chapter_no: 22,
        chapter_goal: '李玄在雨巷门槛处验证旧影规则。',
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.reader_drop_risk_brief.opening_guardrail).toContain('旧影拦门')
    expect(context.chapter_target.reader_drop_risk_brief.middle_guardrail).toContain('旧证推进')
    expect(context.chapter_target.reader_drop_risk_brief.ending_guardrail).toContain('禁库门牌')
    expect(context.reader_drop_risk_brief.drop_points).toContain('开篇三百字没有现场危险，读者会以为只是复盘。')
  })

  test('merges camelCase confirmed innovation brief into prose context', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 22,
          title: '旧印反制',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 22,
        chapter_goal: '李玄用旧印规则代价反制执事。',
        innovationBrief: {
          chapterAngle: '规则代价反差：越强行抢证，旧印反噬越明显。',
          executionPoints: ['让执事抢证动作触发旧印反噬，而不是普通争抢。'],
          differentiationGuardrails: ['不得写成普通证据摊牌。'],
          ipAdaptationHooks: ['旧印在掌心倒转，雨巷长案上的烛火同时变青。'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 22, title: '旧印反制' },
    )

    expect(context.chapter_target.innovation_brief.chapter_angle).toContain('规则代价反差')
    expect(context.chapter_target.innovation_brief.execution_points).toContain('让执事抢证动作触发旧印反噬，而不是普通争抢。')
    expect(context.chapter_target.innovation_brief.differentiation_guardrails).toContain('不得写成普通证据摊牌。')
    expect(context.chapter_target.innovation_brief.ip_adaptation_hooks).toContain('旧印在掌心倒转，雨巷长案上的烛火同时变青。')
    expect(prompt).toContain('执行 chapter_target.innovation_brief')
    expect(prompt).toContain('规则代价反差')
    expect(prompt).toContain('旧印在掌心倒转')
  })

  test('merges camelCase confirmed longform compass into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        longformCompass: {
          readerPromise: '超人力量必须持续撞上规则判定。',
          coreConflict: '蛮力破局与规则边界互相反制。',
          immutableRules: ['超人力量不能变成无代价清场'],
          flexibleZones: ['副本可变化，但必须服务规则破局主线'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.longformCompass.readerPromise).toContain('规则判定')
    expect(context.chapter_target.longform_compass.immutable_rules).toContain('超人力量不能变成无代价清场')
    expect(context.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('规则边界')
  })

  test('merges camelCase confirmed reader expectation ledger into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 9,
          title: '账册启封',
          scene_cards: [],
        },
      },
      {
        chapter_no: 9,
        readerExpectationLedger: {
          chapterPromise: '本章必须兑现旧案账册。',
          mustDeliver: [
            { key: 'ledger_payoff', label: '读者期待', type: 'payoff', text: '旧案账册必须被打开。' },
          ],
          keepAlive: [
            { key: 'old_case_backer', label: '保留悬念', type: 'question', text: '旧案幕后供奉是谁。' },
          ],
          mustNotBreak: ['不能提前公开供奉身份'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.reader_expectation_ledger.chapter_promise).toContain('旧案账册')
    expect(context.chapter_target.reader_expectation_ledger.must_deliver[0].text).toContain('旧案账册必须被打开')
    expect(context.chapter_target.reader_expectation_ledger.keep_alive[0].text).toContain('旧案幕后供奉是谁')
    expect(context.chapter_target.reader_expectation_ledger.must_not_break).toContain('不能提前公开供奉身份')
  })

  test('merges confirmed core contract radar into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        core_contract_radar: {
          summary: '本章必须把超人力量撞上规则判定写成可见事件。',
          must_serve: ['超人力量和规则判定持续碰撞', '蛮力破局与规则判定的对抗'],
          no_drift: ['不能把规则怪谈写成纯打怪'],
          repair_focus: ['补足规则判定反制蛮力'],
          checks: [{ key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '碰撞不够可见' }],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.core_contract_radar.must_serve).toContain('超人力量和规则判定持续碰撞')
    expect(context.chapter_target.core_contract_radar.no_drift).toContain('不能把规则怪谈写成纯打怪')
    expect(context.core_contract_radar.repair_focus).toContain('补足规则判定反制蛮力')
  })

  test('merges camelCase confirmed core contract radar into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        coreContractRadar: {
          summary: '本章必须把规则反制爽点写成现场事件。',
          mustServe: ['读者承诺必须维持规则反制爽点'],
          noDrift: ['不能把校园怪谈改写成纯战斗副本'],
          repairFocus: ['补足规则判定压住蛮力的可见代价'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.coreContractRadar.mustServe).toContain('读者承诺必须维持规则反制爽点')
    expect(context.chapter_target.core_contract_radar.no_drift).toContain('不能把校园怪谈改写成纯战斗副本')
    expect(context.core_contract_radar.repair_focus).toContain('补足规则判定压住蛮力的可见代价')
  })

  test('merges camelCase confirmed longform battle context into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        longformBattleContext: {
          status: 'needs_action',
          summary: '本章必须把长篇核心拉回规则反制。',
          riskChips: ['核心漂移', '读者拉力弱'],
          primaryAction: {
            key: 'repair_story_core',
            label: '修复核心守恒',
            reason: '正文必须让超人力量被规则判定反制。',
          },
          riskLanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              detail: '核心漂移：超人力量像普通无敌流。',
              requiredAction: '写出规则判定压住蛮力的现场代价。',
            },
          ],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.longformBattleContext.riskChips).toContain('核心漂移')
    expect(context.chapter_target.longform_battle_context.summary).toContain('长篇核心拉回规则反制')
    expect(context.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定压住蛮力')
  })

  test('builds storyline context in the chapter context package', () => {
    const monolithSource = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const outlineSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/outline-blueprint-contracts.ts'), 'utf8')
    const handoffSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8')
    const storylineSource = [monolithSource, outlineSource, handoffSource].join('\n')

    expect(storylineSource).toContain('storyline_context')
    expect(storylineSource).toContain('STORYLINE_TYPES')
    expect(storylineSource).toContain('storylineAdvances')
    expect(storylineSource).toContain('storylineForbidden')
  })
})
