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

describe('normalizeSceneCardsPayload pipeline a', () => {
  test('wires deterministic stacked description risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseStackedDescriptionChecks = scanProseStackedDescriptionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseStackedDescriptionChecks')
  })

  test('detects static environment description that is not carried by character interaction', () => {
    const checks = scanProseStaticEnvironmentRisks([
      '第13章 雨夜',
      '',
      '窗外的雨越下越密，青石板被水光铺成一片，街角的灯笼在风里轻轻晃，昏黄的光落在湿漉漉的墙面上。',
      '',
      '檐下的积水顺着瓦缝滴落，空气里浮着潮冷的味道，远处偶尔传来一声闷雷，整条街都显得空旷而沉默。',
      '',
      '林砚推开门，雨水扑到袖口上，他低头看见门槛旁那串新鲜脚印。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_static_environment')
    expect(checks[0].label).toContain('环境交互')
    expect(checks[0].evidence).toContain('窗外的雨')
    expect(checks[0].fix).toContain('角色当下感知')
  })

  test('wires deterministic static environment risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseStaticEnvironmentChecks = scanProseStaticEnvironmentRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseStaticEnvironmentChecks')
  })

  test('detects concrete props and numbers that do not carry plot or emotional function', () => {
    const checks = scanProseDecorativeDetailRisks([
      '第13章 账本',
      '',
      '桌上摊着一本旧账本，第一页写着八万块，旁边放着一把旧钥匙。银色戒指压在账角，内圈刻着三年两个小字，下面还有一张800元收据，纸边已经泛黄。',
      '',
      '窗外雨声更密，屋里一时只剩潮冷的空气。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_decorative_detail')
    expect(checks[0].label).toContain('道具/数字功能')
    expect(checks[0].evidence).toContain('八万块')
    expect(checks[0].fix).toContain('情感重量')
  })

  test('wires deterministic decorative detail risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseDecorativeDetailChecks = scanProseDecorativeDetailRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseDecorativeDetailChecks')
  })

  test('detects abstract paragraphs without a camera anchor or character body focus', () => {
    const checks = scanProseCameraAnchorRisks([
      '第13章 真相',
      '',
      '所谓真相从来不是答案，而是一场迟来的审判。每个人都在命运和欲望之间摇摆，所有选择最终都会指向无法回头的结局。',
      '',
      '林砚低头看向掌心，钥匙齿痕硌进肉里，他这才听见门外第二个人的脚步声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_no_camera_anchor')
    expect(checks[0].label).toContain('镜头对象')
    expect(checks[0].evidence).toContain('所谓真相')
    expect(checks[0].fix).toContain('角色身体')
  })

  test('wires deterministic camera-anchor risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseCameraAnchorChecks = scanProseCameraAnchorRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseCameraAnchorChecks')
  })

  test('detects omniscient crowd camera lines that pull out of limited POV', () => {
    const checks = scanProseOmniscientCrowdCameraRisks([
      '第14章 问罪',
      '',
      '整个审判厅陷入死寂。',
      '所有人都被这一幕震住。',
      '全场鸦雀无声，只剩下江辰手里的账册。',
      '江辰听见自己指节压住纸页的声音。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('omniscient_crowd_camera_line_3')
    expect(checks[0].label).toBe('深度限知远景扫描')
    expect(checks[0].evidence).toContain('整个审判厅陷入死寂')
    expect(checks[0].fix).toContain('角色此刻')
    expect(checks[0].fix).toContain('心跳')
  })

  test('wires deterministic omniscient crowd camera risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseOmniscientCrowdCameraChecks = scanProseOmniscientCrowdCameraRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseOmniscientCrowdCameraChecks')
  })

  test('detects long exposition paragraphs where setting is not carried by conflict', () => {
    const checks = scanInfodumpRisks([
      '第5章 规则课',
      '',
      '规则塔体系分为三层，第一层负责记录学生身份，第二层负责校验夜间行动权限，第三层则会根据违规次数触发不同惩罚。这个机制的原理来自旧校区留下的契约，因此所有进入教学楼的人都会被自动纳入名单。所谓名单并不是普通纸页，而是一种绑定灵魂的设定，通常只有管理员才能修改。',
      '',
      '李辰抬头时，广播忽然响起：“十秒后核验身份。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('infodump_paragraph_1')
    expect(checks[0].evidence).toContain('规则塔体系')
    expect(checks[0].fix).toContain('冲突')
  })

  test('wires deterministic infodump risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicInfodumpChecks = scanInfodumpRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicInfodumpChecks')
  })

  test('detects recap filler paragraphs that repeat prior events without new perspective', () => {
    const checks = scanRecapFillerRisks([
      '第6章 旧名单',
      '',
      '李辰想起之前在旧教学楼里发生的一切。那时候广播第一次响起，名单第一次变红，门牌也曾经自己翻转。过去那些细节在脑海里一遍遍浮现，当初每个人的表情都很紧张，昨晚那阵风和那张旧纸也让他记了很久。',
      '',
      '玻璃门忽然震了一下，点名册上的红字往下渗。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('recap_filler_paragraph_1')
    expect(checks[0].label).toBe('回忆复述水字数扫描')
    expect(checks[0].evidence).toContain('之前在旧教学楼')
    expect(checks[0].fix).toContain('新证据')
    expect(checks[0].fix).toContain('当前冲突')
  })

  test('does not flag recap when it produces a new clue or decision', () => {
    const checks = scanRecapFillerRisks([
      '第6章 旧名单',
      '',
      '李辰想起昨晚门牌翻转的顺序，终于意识到第三块门牌不是编号，而是指向点名册背面的血印。他伸手按住名单，决定先验证那枚血印。',
      '',
      '玻璃门忽然震了一下，点名册上的红字往下渗。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic recap filler risks into quality audit and cleanup gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )
    const cleanupBlock = readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').slice(
      readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('export function buildDeterministicProseCleanupReport'),
      readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('export function buildQualityGateReviewWithDeterministicCleanup'),
    )

    expect(reviewBlock).toContain('const deterministicRecapFillerChecks = scanRecapFillerRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicRecapFillerChecks')
    expect(cleanupBlock).toContain('const fillerChecks = scanRecapFillerRisks(proseScanText)')
    expect(cleanupBlock).toContain("type: 'filler'")
  })

  test('detects abstract emotion telling that should be grounded in body action', () => {
    const checks = scanEmotionTellingRisks([
      '第6章 名单核验',
      '',
      '李辰感到一阵恐惧，他心里很慌，也不知道该怎么面对眼前的广播。',
      '',
      '张智抓住他的手腕，把学生证按在感应区上。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('emotion_telling_line_3')
    expect(checks[0].evidence).toContain('感到一阵恐惧')
    expect(checks[0].fix).toContain('身体动作')
  })

  test('detects vague complex-emotion telling without body action anchors', () => {
    const brokenChecks = scanEmotionTellingRisks([
      '第6章 名单核验',
      '',
      '沈栀心中泛起一种复杂的情绪，那种说不清的滋味让她一时间无法回应。',
      '',
      '旧账本停在桌角。',
    ].join('\n'))
    const anchoredChecks = scanEmotionTellingRisks([
      '第6章 名单核验',
      '',
      '沈栀握紧账本，指节压到发白，那种说不清的滋味堵在喉咙里，她没有立刻开口。',
    ].join('\n'))

    expect(brokenChecks).toHaveLength(1)
    expect(brokenChecks[0].key).toBe('emotion_telling_line_3')
    expect(brokenChecks[0].label).toBe('情绪动作化扫描')
    expect(brokenChecks[0].evidence).toContain('复杂的情绪')
    expect(brokenChecks[0].fix).toContain('可见行为')
    expect(anchoredChecks).toHaveLength(0)
  })

  test('wires deterministic emotion telling risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEmotionTellingChecks = scanEmotionTellingRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEmotionTellingChecks')
  })

  test('detects repeated same-emotion paragraphs without new action or payoff', () => {
    const checks = scanEmotionalStasisRisks([
      '第12章 红灯之后',
      '',
      '李辰心里一阵恐惧，广播里的清除两个字像冷水灌进后背。他感到害怕，连指尖都像被冻住。',
      '',
      '他仍然害怕，胸口的恐惧一层层压下来，脑子里只剩下如果失败就完了这个念头。',
      '',
      '恐惧继续蔓延，他感到无比不安，所有声音都像隔着水面传来。',
      '',
      '门外忽然响起第二个人的脚步声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('emotional_stasis_fear_1_3')
    expect(checks[0].label).toBe('情绪原地打转扫描')
    expect(checks[0].evidence).toContain('第1-3段')
    expect(checks[0].fix).toContain('动作')
    expect(checks[0].fix).toContain('新信息')
    expect(checks[0].fix).toContain('释放')
  })

  test('wires deterministic emotional stasis risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEmotionalStasisChecks = scanEmotionalStasisRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEmotionalStasisChecks')
  })

  test('detects downward pressure without reader safety signal', () => {
    const checks = scanDownwardSafetyRisks([
      '第12章 公审台',
      '',
      '主任当众把李辰的申请表撕碎，冷声说他这种人不配参加终审。',
      '',
      '台下几个学生跟着笑起来，有人故意把他的资料踢到地上。',
      '',
      '副考官宣布他的资格暂时冻结，如果再申诉就直接记过。',
      '',
      '李辰低头站在原地，身边没有一个人替他说话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('downward_without_safety_1_3')
    expect(checks[0].label).toBe('下行情节安全感扫描')
    expect(checks[0].evidence).toContain('第1-3段')
    expect(checks[0].fix).toContain('锅是别人的')
    expect(checks[0].fix).toContain('可能的解法')
  })

  test('does not flag downward pressure when a counterplay signal keeps reader safety', () => {
    const checks = scanDownwardSafetyRisks([
      '第12章 公审台',
      '',
      '主任当众把李辰的申请表撕碎，冷声说他这种人不配参加终审。',
      '',
      '李辰没有争辩，只把袖口里的录音笔往掌心压了一下，红点还在亮。',
      '',
      '副考官宣布他的资格暂时冻结，如果再申诉就直接记过。',
      '',
      '张智在台下抬眼，看见监控屏右上角的备份进度已经跳到百分之九十七。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic downward safety risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDownwardSafetyChecks = scanDownwardSafetyRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDownwardSafetyChecks')
  })

  test('detects oppression that does not serve payoff, counterplay, or information gain', () => {
    const checks = scanOppressionPurposeRisks([
      '第12章 审判台',
      '',
      '执事把名册摔到李玄脚边，逼他跪下认罪。',
      '',
      '台下弟子跟着哄笑，有人骂他废物，有人让他滚出阵堂。',
      '',
      '李玄低头沉默，任由那些话砸在身上。',
      '',
      '长老挥手让他退到角落，这场审问暂时结束。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('oppression_without_purpose_1_4')
    expect(checks[0].label).toBe('压制目的扫描')
    expect(checks[0].evidence).toContain('逼他跪下')
    expect(checks[0].fix).toContain('后续爆发')
    expect(checks[0].fix).toContain('反击')
    expect(checks[0].fix).toContain('信息收益')
  })

  test('does not flag oppression when it sets up counterplay or payoff', () => {
    const checks = scanOppressionPurposeRisks([
      '第12章 审判台',
      '',
      '执事把名册摔到李玄脚边，逼他跪下认罪。',
      '',
      '台下弟子跟着哄笑，有人骂他废物，有人让他滚出阵堂。',
      '',
      '李玄没有跪，只把袖口里的录音红点亮给众人看。',
      '',
      '下一息，他反手把真账册推上桌，逼执事当众解释缺页来源。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic oppression purpose risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOppressionPurposeChecks = scanOppressionPurposeRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOppressionPurposeChecks')
  })

  test('detects long chapter stretches without visible reader payoff', () => {
    const dryParagraph = '李辰沿着旧楼的走廊往前走，墙上的值日表被风吹得轻轻晃动，地面积着一层潮气，他停下来听了听远处的广播，又把昨天整理过的资料重新在脑子里过了一遍。'
    const checks = scanPayoffDensityRisks([
      '第12章 旧楼长廊',
      '',
      dryParagraph.repeat(12),
      '',
      '他把资料收回包里，继续往楼梯口走去。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('payoff_density_gap_1_2')
    expect(checks[0].label).toBe('回报密度扫描')
    expect(checks[0].evidence).toContain('连续')
    expect(checks[0].fix).toContain('800-1200字')
    expect(checks[0].fix).toContain('信息增量')
    expect(checks[0].fix).toContain('小回收')
  })

  test('does not flag payoff density when the stretch has information gain or counterplay', () => {
    const dryParagraph = '李辰沿着旧楼的走廊往前走，墙上的值日表被风吹得轻轻晃动，地面积着一层潮气，他停下来听了听远处的广播，又把昨天整理过的资料重新在脑子里过了一遍。'
    const checks = scanPayoffDensityRisks([
      '第12章 旧楼长廊',
      '',
      dryParagraph.repeat(5),
      '',
      '他终于发现门禁阵纹的第二层规则，袖口里的旧钥匙随之发热，藏书阁封锁被他反制出一道缺口。',
      '',
      dryParagraph.repeat(4),
      '',
      '张智看懂他的手势，第一次公开站到他身侧，低声说这份记录可以洗清昨夜的污名。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic payoff density risks into emotional arc self review and cleanup gate', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )
    const cleanupBlock = readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').slice(
      readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('export function buildDeterministicProseCleanupReport'),
      readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('const categories = [', readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('export function buildDeterministicProseCleanupReport')),
    )

    expect(reviewBlock).toContain('const deterministicPayoffDensityChecks = scanPayoffDensityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicPayoffDensityChecks')
    expect(cleanupBlock).toContain('const payoffDensityChecks = scanPayoffDensityRisks(proseScanText)')
  })

  test('detects repeated payoff beats without escalation', () => {
    const checks = scanPayoffEscalationRisks([
      '第12章 连环反击',
      '',
      '李辰拿出第一份报告，台下所有人震惊，对面的学生脸色发白。',
      '',
      '他又拿出第二份报告，所有人再次震惊，那个学生彻底说不出话。',
      '',
      '他继续拿出第三份报告，全场还是震惊，对方只能低头认输。',
      '',
      '李辰收起报告，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('payoff_escalation_flat_1_3')
    expect(checks[0].label).toBe('爽点递增扫描')
    expect(checks[0].evidence).toContain('第1-3段')
    expect(checks[0].fix).toContain('影响范围')
    expect(checks[0].fix).toContain('揭示深度')
    expect(checks[0].fix).toContain('身份落差')
  })

  test('does not flag payoff beats that escalate scope depth or stakes', () => {
    const checks = scanPayoffEscalationRisks([
      '第12章 连环反击',
      '',
      '李辰拿出第一份报告，班里所有人震惊，刚才嘲笑他的学生脸色发白。',
      '',
      '他把第二份审计报告投到大屏上，主考官也站了起来，因为这证明整场考核记录被人改过。',
      '',
      '第三份名单公开时，院长亲自按停直播：名单背后牵出的是校董会交易，所有涉事人都要接受调查。',
      '',
      '广播随即改写规则：“下一轮核验，由李辰指定名单。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic payoff escalation risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicPayoffEscalationChecks = scanPayoffEscalationRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicPayoffEscalationChecks')
  })

  test('detects trump cards or goldfingers revealed without visible effect', () => {
    const checks = scanTrumpCardEffectRisks([
      '第12章 试炼台',
      '',
      '李玄终于亮出袖中的底牌，残阵在掌心亮起。',
      '',
      '执事只看了一眼，冷笑道：“不过如此。”',
      '',
      '下一刻，执事反而一掌把他逼退三步，台下弟子跟着哄笑。',
      '',
      '李玄收回手，没有再解释。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('trump_card_effect_missing_1')
    expect(checks[0].label).toBe('底牌效果扫描')
    expect(checks[0].evidence).toContain('亮出袖中的底牌')
    expect(checks[0].fix).toContain('金手指')
    expect(checks[0].fix).toContain('压制')
    expect(checks[0].fix).toContain('效果')
  })

  test('does not flag trump cards when the opponent is visibly suppressed', () => {
    const checks = scanTrumpCardEffectRisks([
      '第12章 试炼台',
      '',
      '李玄终于亮出袖中的底牌，残阵在掌心亮起。',
      '',
      '执事脸色发白，刚才压住他的阵图当场裂开。',
      '',
      '台下弟子倒吸一口凉气，主考官第一次站起身：“这道残阵反制了禁库阵纹。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic trump card effect risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicTrumpCardEffectChecks = scanTrumpCardEffectRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicTrumpCardEffectChecks')
  })

  test('detects upgrades that do not show new ability or rebuild the next threshold', () => {
    const checks = scanUpgradeAftermathRisks([
      '第13章 二阶',
      '',
      '系统提示等级提升，李玄突破到二阶，面板上多了一行奖励。',
      '',
      '众人点头，掌柜也松了口气，事情就这样结束。',
      '',
      '李玄收起面板，回到房间休息。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('upgrade_aftermath_missing_1')
    expect(checks[0].label).toBe('升级后果扫描')
    expect(checks[0].evidence).toContain('等级提升')
    expect(checks[0].fix).toContain('新能力威力')
    expect(checks[0].fix).toContain('更高门槛')
  })

  test('does not flag upgrades that show a new ability and introduce a higher threshold', () => {
    const checks = scanUpgradeAftermathRisks([
      '第13章 二阶',
      '',
      '系统提示等级提升，李玄突破到二阶。',
      '',
      '他第一次看见设备内壁隐藏裂纹，指尖一压，三秒内修好那台报废进口机，客户当场改口加价。',
      '',
      '然而屏幕随即弹出医院设备的红色警报：下一台机器必须在十分钟内完成，否则整层病房都会断电。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic upgrade aftermath risks into upgrade rhythm self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicUpgradeAftermathChecks = scanUpgradeAftermathRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicUpgradeAftermathChecks')
  })

  test('wires deterministic upgrade rhythm hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicUpgradeRhythmChecks = [buildUpgradeRhythmDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicUpgradeRhythmChecks')
  })

})
