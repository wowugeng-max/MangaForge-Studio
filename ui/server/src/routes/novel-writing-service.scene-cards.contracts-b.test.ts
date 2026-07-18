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

describe('normalizeSceneCardsPayload contracts b', () => {
  test('projects payoff-setup carry-over into scene setup and payoff fields', () => {
    const payoffSetupRepair = '下一章必须补爽点铺垫：旧印反锁的打脸 payoff 必须先铺对手施压、规则限制和主角暗手，不能突然给证据爽点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '对手施压',
          purpose: '先铺对手施压',
          beat: '管事当众宣布旧印无效。',
        },
        {
          title: '反锁打脸',
          purpose: '回收旧印反锁 payoff',
          beat: '李玄用暗手让旧印反锁管事权限。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [payoffSetupRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(payoffSetupRepair)
    expect(sceneCards[1].required_beats).toContain(payoffSetupRepair)
    expect(sceneCards[1].reader_payoff).toContain(payoffSetupRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('爽点铺垫')
    expect(sceneCards[1].serial_risk_repairs).toContain('爽点铺垫')
  })
  test('projects spectator-reaction carry-over into scene audience payoff fields', () => {
    const spectatorReactionRepair = '下一章必须补围观反应：旧印反锁后要写出旁观者分层震惊、专家读懂规则变化和对手失声，放大读者爽点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旁观分层',
          purpose: '写出旁观者分层震惊',
          beat: '外门弟子先愣住，长老席随后站起。',
        },
        {
          title: '专家读懂',
          purpose: '让专家解释规则变化',
          beat: '林青禾低声说权限倒转了。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [spectatorReactionRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(spectatorReactionRepair)
    expect(sceneCards[1].required_beats).toContain(spectatorReactionRepair)
    expect(sceneCards[0].character_voice).toContain(spectatorReactionRepair)
    expect(sceneCards[1].reader_payoff).toContain(spectatorReactionRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('围观反应')
    expect(sceneCards[1].serial_risk_repairs).toContain('围观反应')
  })
  test('projects foreshadowing-delta carry-over into scene clue and hook fields', () => {
    const foreshadowingDeltaRepair = '下一章必须补伏笔增量：第二枚旧印背面缺编号要作为新伏笔入场，先给可见线索，再留到章尾变成黑塔许可问题。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '缺编号入场',
          purpose: '让第二枚旧印背面缺编号入场',
          beat: '李玄翻到旧印背面，编号处被磨平。',
        },
        {
          title: '黑塔问题',
          purpose: '章尾把缺编号转成新问题',
          beat: '磨平的位置露出黑塔许可的半枚纹路。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [foreshadowingDeltaRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(foreshadowingDeltaRepair)
    expect(sceneCards[1].required_information).toContain(foreshadowingDeltaRepair)
    expect(sceneCards[0].information_gap).toContain(foreshadowingDeltaRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(foreshadowingDeltaRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('伏笔增量')
    expect(sceneCards[1].serial_risk_repairs).toContain('伏笔增量')
  })
  test('projects character-behavior carry-over into scene action and voice fields', () => {
    const characterBehaviorRepair = '下一章必须补角色行为：先写清李玄的动机链，再让周薄森的反派逻辑从保住账本来源出发。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '证人上堂',
          purpose: '让李玄说明自己为何保护证人',
          beat: '李玄挡在证人身前。',
          character_voice: '李玄说话压低，避免暴露证人来源。',
        },
        {
          title: '执事改口',
          purpose: '让周薄森为了账本来源调整策略',
          beat: '周薄森先扣住账本，再逼证人改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [characterBehaviorRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(characterBehaviorRepair)
    expect(sceneCards[1].action_beats).toContain(characterBehaviorRepair)
    expect(sceneCards[0].character_voice).toContain(characterBehaviorRepair)
    expect(sceneCards[1].character_voice).toContain(characterBehaviorRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('角色行为')
    expect(sceneCards[1].serial_risk_repairs).toContain('角色行为')
  })
  test('does not project generic intent carry-over as character behavior', () => {
    const hookRepair = '下一章必须补章级钩子：最后100字留下反派意图的问题，但不提前解释答案。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '证人回避',
          purpose: '让证人只说出一半真相',
          beat: '证人避开反派名字。',
        },
        {
          title: '意图未明',
          purpose: '章尾留下新问题',
          beat: '李玄发现反派真正目标另有其物。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [hookRepair],
        },
      },
    })

    expect(sceneCards[0].information_gap).toContain(hookRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(hookRepair)
    expect(sceneCards[0].action_beats).not.toContain(hookRepair)
    expect(sceneCards[1].action_beats).not.toContain(hookRepair)
    expect(sceneCards[0].serial_risk_repairs).not.toContain('角色行为')
    expect(sceneCards[1].serial_risk_repairs).not.toContain('角色行为')
  })
  test('normalizes camelCase sceneCards from model output', () => {
    const sceneCards = normalizeSceneCardsPayload({
      sceneCards: [
        {
          sceneNo: 2,
          title: '账册翻面',
          sceneType: 'payoff',
          charactersPresent: ['李玄', '林青禾'],
          purposeTag: '爽点',
          purposeTags: ['爽点', '证据反转'],
          requiredBeats: ['翻出缺页', '逼迫执事改口'],
          actionBeats: ['扣住账册', '当众翻面'],
          openingHook: '账册背面有第二道墨痕。',
          readerPayoff: '主角用证据反制栽赃。',
          fearPoint: '执事当场撕页灭证。',
          rulePressure: '审判庭只认纸面证据。',
          informationGap: '第二道墨痕是谁留下的。',
          endingHookSeed: '缺页背后压着第三个名字。',
          characterVoice: '李玄压低声音逼问。',
          stateChangesExpected: [{ asset: '第二本账册', state: '归李玄掌控' }],
          descriptionBudget: 'high',
          transitionFromPrevious: '承接上一场对峙',
          exitState: '执事失去主动权',
        },
      ],
    })

    expect(sceneCards).toHaveLength(1)
    expect(sceneCards[0]).toMatchObject({
      scene_no: 2,
      scene_type: 'payoff',
      characters_present: ['李玄', '林青禾'],
      purpose_tag: '爽点',
      purpose_tags: ['爽点', '证据反转'],
      required_beats: ['翻出缺页', '逼迫执事改口'],
      action_beats: ['扣住账册', '当众翻面'],
      opening_hook: '账册背面有第二道墨痕。',
      reader_payoff: '主角用证据反制栽赃。',
      fear_point: '执事当场撕页灭证。',
      rule_pressure: '审判庭只认纸面证据。',
      information_gap: '第二道墨痕是谁留下的。',
      ending_hook_seed: '缺页背后压着第三个名字。',
      character_voice: '李玄压低声音逼问。',
      state_changes_expected: ['{"asset":"第二本账册","state":"归李玄掌控"}'],
      description_budget: 'high',
      transition_from_previous: '承接上一场对峙',
      exit_state: '执事失去主动权',
    })
  })
  test('detects slow scenery or daily-life openings before the story hook lands', () => {
    const checks = scanOpeningHookRisks([
      '第3章 校门外',
      '',
      '清晨的阳光落在教学楼外，风吹过空荡的操场，窗外的树影慢慢晃动。',
      '李辰照常走进教室，把书包塞进抽屉。',
      '他翻开课本，又把昨天夹好的练习册摊平，粉笔灰从讲台边缘落下来。',
      '走廊里没有脚步声，值日表还贴在门后，所有座位都像平时一样安静。',
      '直到广播响起，所有人才意识到规则变了。',
    ].join('\n'))

    expect(checks.some(item => item.key === 'opening_scenery_or_daily_start')).toBe(true)
    expect(checks.some(item => item.key === 'opening_hook_deadline')).toBe(true)
    expect(checks[0].fix).toContain('前100字')
  })
  test('wires deterministic opening hook risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningHookChecks = scanOpeningHookRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningHookChecks')
  })
  test('detects openings without conflict or abnormality in the first 50 characters', () => {
    const checks = scanOpeningFirst50ConflictRisks([
      '第1章 旧楼铃声',
      '',
      '清晨的光落在旧楼台阶上，李岚把钥匙放进口袋，沿着空荡走廊慢慢往前走。',
      '直到门后响起第二个人的呼吸声，他才停下。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_first50_conflict_missing')
    expect(checks[0].label).toBe('前50字冲突异常扫描')
    expect(checks[0].evidence).toContain('清晨的光')
    expect(checks[0].fix).toContain('前 50 字')
    expect(checks[0].fix).toContain('冲突')
  })
  test('does not flag first 50 characters when conflict or abnormality is visible', () => {
    const checks = scanOpeningFirst50ConflictRisks([
      '第1章 旧楼铃声',
      '',
      '门后突然传来第二个人的呼吸声，李岚握紧钥匙，听见锁孔里有人喊他的名字。',
      '清晨的光这才落到旧楼台阶上。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic first-50 conflict risks into opening self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningFirst50Checks = scanOpeningFirst50ConflictRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningFirst50Checks')
  })
  test('detects low event density in the first 100 characters of the opening', () => {
    const checks = scanOpeningEventDensityRisks([
      '第3章 校门外',
      '广播响了一声。',
      '走廊的灯光仍旧昏暗，墙皮被雨水泡出细小的裂纹，值夜名单贴在门边，空气里全是潮湿的铁锈味。',
      '李辰站在门口，想到昨天的规则还没有解释清楚。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_event_density_low')
    expect(checks[0].label).toContain('事件密度')
    expect(checks[0].evidence).toContain('事件数')
    expect(checks[0].fix).toContain('前100字')
    expect(checks[0].fix).toContain('至少 3 个事件')
  })
  test('wires deterministic opening event density risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningEventDensityChecks = scanOpeningEventDensityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningEventDensityChecks')
  })
  test('detects openings where the protagonist does not enter within the first 300 characters', () => {
    const checks = scanOpeningProtagonistDelayRisks([
      '第1章 旧校规',
      '',
      '午夜教学楼的广播忽然响起，走廊尽头的红灯一盏接一盏亮起。',
      '校规贴在玻璃门内侧，第一行写着：十点后不得单独离开宿舍。',
      '值夜名单被雨水泡皱，名字旁边的黑点像干涸的血。',
      '三楼钟声停在九点五十九分，楼梯口的安全门自己锁上。',
      '规则册第二页翻开，惩罚栏只剩一行空白。',
      '旧校徽在门缝里轻轻震动，金属背面刻着上一届失踪学生的编号。',
      '宿舍区的电闸一排排跳下去，墙上的考勤屏只剩红色倒影。',
      '第五条校规被墨水盖住半截，只露出“不得回应门外的人”。',
      '公告栏最底下贴着一张旧照片，照片里的操场空无一人，旗杆影子却多出两道。',
      '每一间宿舍门牌都变成同一个数字，走廊尽头的水管开始往外渗黑水。',
      '广播把校规重复到第六遍，惩罚栏里的空白慢慢浮出一枚陌生指纹。',
      '直到第六遍广播响完，李辰才从宿舍床上坐起。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_protagonist_delayed')
    expect(checks[0].label).toBe('开篇主角登场扫描')
    expect(checks[0].evidence).toContain('前300字')
    expect(checks[0].fix).toContain('主角')
    expect(checks[0].fix).toContain('动作')
  })
  test('wires deterministic protagonist delay risks into opening self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningProtagonistDelayChecks = scanOpeningProtagonistDelayRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningProtagonistDelayChecks')
  })
  test('detects early openings that miss the title synopsis entry promise', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      {
        title: '血缘系统：我有三位隐藏妈妈',
        synopsis: '主角开局被裁员后觉醒血缘系统，第一次检测就发现三位妈妈身份反常。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['血缘系统检测', '三位妈妈身份反转'],
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 1,
          title: '旧楼铃声',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
        '',
        '他握紧手里的裁员信，知道今晚不能再出错。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].label).toBe('入口承诺对齐扫描')
    expect(checks[0].evidence).toContain('血缘系统')
    expect(checks[0].fix).toContain('书名')
    expect(checks[0].fix).toContain('简介')
    expect(checks[0].fix).toContain('开篇')
  })
  test('reads camelCase preDraftBrief reader promise for entry promise alignment', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      { title: '旧楼铃声' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '旧楼铃声',
        },
        preDraftBrief: {
          readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
        '',
        '他握紧手里的裁员信，知道今晚不能再出错。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].evidence).toContain('血缘系统')
    expect(checks[0].evidence).toContain('三位妈妈')
  })
  test('reads runtime camelCase chapterTarget reader promise for entry promise alignment', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      { title: '旧楼铃声' },
      {
        chapterTarget: {
          chapterNo: 1,
          title: '旧楼铃声',
          readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
        '',
        '他握紧手里的裁员信，知道今晚不能再出错。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].evidence).toContain('血缘系统')
    expect(checks[0].evidence).toContain('三位妈妈')
  })
  test('uses runtime camelCase chapterTarget chapter number over stale chapter_target for entry promise alignment', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      { title: '旧楼铃声' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '陈旧章节',
        },
        chapterTarget: {
          chapterNo: 1,
          title: '旧楼铃声',
          readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].evidence).toContain('血缘系统')
  })
  test('does not flag entry promise alignment when the opening shows the promised hook', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      {
        title: '血缘系统：我有三位隐藏妈妈',
        synopsis: '主角开局被裁员后觉醒血缘系统，第一次检测就发现三位妈妈身份反常。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['血缘系统检测', '三位妈妈身份反转'],
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 1,
          title: '第一次检测',
        },
      },
      [
        '第1章 第一次检测',
        '',
        '李岚把裁员信塞进口袋，眼前忽然弹出血缘系统的蓝色面板。',
        '',
        '第一次检测结果跳出来：三位妈妈的身份栏全部亮成红色。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic entry promise alignment into opening self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEntryPromiseChecks = scanEntryPromiseAlignmentRisks(project, contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicEntryPromiseChecks')
  })
  test('detects openings that do not surface the planned core conflict early', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      chapter_target: {
        chapter_no: 12,
        conflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
      '他想起昨夜没有睡好，只能先整理呼吸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_core_conflict_missing')
    expect(checks[0].label).toBe('开篇核心冲突扫描')
    expect(checks[0].evidence).toContain('执事设局阻拦主角参加试炼')
    expect(checks[0].fix).toContain('前 300 字')
    expect(checks[0].fix).toContain('本章核心矛盾')
  })
  test('reads camelCase preDraftBrief core conflict for opening alignment scan', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      preDraftBrief: {
        coreConflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
      '他想起昨夜没有睡好，只能先整理呼吸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_core_conflict_missing')
    expect(checks[0].evidence).toContain('执事设局阻拦主角参加试炼')
  })
  test('reads runtime camelCase chapterTarget core conflict for opening alignment scan', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      chapterTarget: {
        chapterNo: 12,
        coreConflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
      '他想起昨夜没有睡好，只能先整理呼吸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_core_conflict_missing')
    expect(checks[0].evidence).toContain('执事设局阻拦主角参加试炼')
  })
  test('does not flag opening conflict alignment when the planned obstacle appears early', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      chapter_target: {
        chapter_no: 12,
        conflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '执事在演武场门口拦住李玄，把试炼名册当众合上。',
      '“你的资格作废。”',
      '李玄抬头，看见名册边角压着昨夜那枚残阵印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic opening conflict alignment into opening self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningConflictChecks = scanOpeningConflictAlignmentRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningConflictChecks')
  })
  test('detects summary-style endings that do not leave a page-turn hook', () => {
    const checks = scanEndingHookRisks([
      '李辰关上门，教室终于安静下来。',
      '经历了这一切，他明白自己必须更加努力。',
      '新的生活才刚刚开始。',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_summary_without_hook')).toBe(true)
    expect(checks.some(item => item.key === 'ending_hook_missing')).toBe(true)
    expect(checks[0].fix).toContain('最后100字')
  })
  test('wires deterministic ending hook risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEndingHookChecks = scanEndingHookRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEndingHookChecks')
  })
  test('detects important clues that suddenly appear at the ending without warmup', () => {
    const checks = scanSuddenEndingClueRisks([
      '第8章 审判庭',
      '',
      '李玄把执事逼退半步，审判庭终于安静下来。',
      '',
      '众人开始整理散落的卷宗，林青禾低声问他下一步怎么办。',
      '',
      '他正要离开，桌下突然掉出第二本账册，夹页里还露出禁地钥匙。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('sudden_ending_clue_without_warmup')
    expect(checks[0].label).toBe('章尾线索预热扫描')
    expect(checks[0].evidence).toContain('突然掉出第二本账册')
    expect(checks[0].fix).toContain('预热')
    expect(checks[0].fix).toContain('章尾')
  })
  test('does not flag ending clues that were warmed up earlier in the chapter', () => {
    const checks = scanSuddenEndingClueRisks([
      '第8章 审判庭',
      '',
      '审判开始前，李玄注意到桌下抽屉合不严，旧账册缺页卡在缝里。',
      '',
      '林青禾拖住证人时，他用指腹摸到夹层里有一枚钥匙齿痕。',
      '',
      '他正要离开，桌下突然掉出第二本账册，夹页里还露出禁地钥匙。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic sudden ending clue risks into chapter hook checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSuddenEndingClueChecks = scanSuddenEndingClueRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSuddenEndingClueChecks')
  })
  test('detects missing ending contract state or next chapter pull when only a question is visible', () => {
    const contextPackage = {
      chapter_target: {
        chapter_blueprint: {
          ending_contract: {
            final_state: '江辰公开旧账后被逐出内门候选名单。',
            unresolved_question: '第二本账册是谁藏进禁库的。',
            next_chapter_pull: '江辰必须在子时前潜入禁库查第二本账册。',
          },
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '第12章 旧账',
      '',
      '江辰盯着账册缺页，终于问出口：“第二本账册是谁藏进禁库的？”',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_contract_missing_final_state_and_next_chapter_pull')).toBe(true)
    expect(checks[0].fix).toContain('收束状态')
    expect(checks[0].fix).toContain('下一章推动力')
  })
  test('reads direct camelCase ending contract from preDraftBrief during deterministic review', () => {
    const contextPackage = {
      preDraftBrief: {
        endingContract: {
          finalState: '江辰公开旧账后被逐出内门候选名单。',
          unresolvedQuestion: '第二本账册是谁藏进禁库的。',
          nextChapterPull: '江辰必须在子时前潜入禁库查第二本账册。',
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '第12章 旧账',
      '',
      '江辰盯着账册缺页，终于问出口：“第二本账册是谁藏进禁库的？”',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_contract_missing_final_state_and_next_chapter_pull')).toBe(true)
    expect(checks[0].fix).toContain('收束状态')
    expect(checks[0].fix).toContain('下一章推动力')
  })
  test('reads runtime camelCase chapterTarget endingContract during deterministic review', () => {
    const contextPackage = {
      chapterTarget: {
        chapterNo: 12,
        title: '旧账',
        endingContract: {
          finalState: '江辰公开旧账后被逐出内门候选名单。',
          unresolvedQuestion: '第二本账册是谁藏进禁库的。',
          nextChapterPull: '江辰必须在子时前潜入禁库查第二本账册。',
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '第12章 旧账',
      '',
      '江辰盯着账册缺页，终于问出口：“第二本账册是谁藏进禁库的？”',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_contract_missing_final_state_and_next_chapter_pull')).toBe(true)
    expect(checks[0].fix).toContain('收束状态')
    expect(checks[0].fix).toContain('下一章推动力')
  })
  test('does not flag ending contract when state question and next pull are visible in the tail', () => {
    const contextPackage = {
      chapter_target: {
        chapter_blueprint: {
          ending_contract: {
            final_state: '江辰公开旧账后被逐出内门候选名单。',
            unresolved_question: '第二本账册是谁藏进禁库的。',
            next_chapter_pull: '江辰必须在子时前潜入禁库查第二本账册。',
          },
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '江辰公开旧账，执事当场把他的内门候选玉牌摘下。',
      '他被逐出内门候选名单，只剩账册缺页贴在掌心。',
      '“第二本账册是谁藏进禁库的？”',
      '子时前，他必须潜入禁库查清第二本账册，否则旧账会被彻底封死。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic ending contract risks into chapter hook checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEndingContractChecks = scanEndingContractExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicEndingContractChecks')
  })
  test('detects opening hooks that are neither paid off nor carried forward at the ending', () => {
    const checks = scanOpeningHookEchoRisks([
      '第10章 公审台',
      '',
      '证据刚摆上桌就被执事当众撕毁，碎纸落在李辰脚边。',
      '',
      '台下的人跟着起哄，催他立刻认罪。',
      '',
      '李辰穿过侧门，按照旧流程完成了内门报名。',
      '',
      '夜色落下来，他终于可以回去休息。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_hook_not_echoed')
    expect(checks[0].label).toBe('开篇钩子回收扫描')
    expect(checks[0].evidence).toContain('证据')
    expect(checks[0].fix).toContain('回收')
  })
})
