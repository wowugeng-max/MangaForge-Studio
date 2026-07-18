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

describe('normalizeSceneCardsPayload pipeline', () => {
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

  test('detects long internal monologue runs as prose craft AI smell', () => {
    const checks = scanInternalMonologueRisks([
      '第13章 门后的人',
      '',
      '李辰突然明白，管理员从一开始就在试探他。',
      '他意识到那张名单不是警告，而是筛选。',
      '他心里想，如果自己刚才开门，张智一定会被拖进走廊。',
      '他终于知道，广播里漏掉的名字才是今晚真正的陷阱。',
      '门外的钥匙轻轻碰了一下锁孔。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('internal_monologue_run_3_6')
    expect(checks[0].label).toBe('内心独白压缩扫描')
    expect(checks[0].evidence).toContain('管理员从一开始')
    expect(checks[0].evidence).toContain('真正的陷阱')
    expect(checks[0].fix).toContain('压缩为1句')
    expect(checks[0].fix).toContain('动作')
    expect(checks[0].fix).toContain('对白')
  })

  test('detects internal monologue runs split across prose paragraphs', () => {
    const checks = scanInternalMonologueRisks([
      '第13章 门后的人',
      '',
      '李辰突然明白，管理员从一开始就在试探他。',
      '',
      '他意识到那张名单不是警告，而是筛选。',
      '',
      '他心里想，如果自己刚才开门，张智一定会被拖进走廊。',
      '',
      '门外的钥匙轻轻碰了一下锁孔。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('internal_monologue_run_3_7')
    expect(checks[0].evidence).toContain('管理员从一开始')
    expect(checks[0].evidence).toContain('不是警告')
    expect(checks[0].fix).toContain('连续3句以上内心独白')
  })

  test('detects parenthetical internal monologue labels that break immersion', () => {
    const checks = scanInternalMonologueRisks([
      '第13章 门后的人',
      '',
      '李辰把手按在门锁上。',
      '（他心想：管理员果然一直在试探我，我绝不能露怯。）',
      '门缝里的钥匙轻轻碰了一下锁孔。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('parenthetical_internal_monologue_line_4')
    expect(checks[0].label).toBe('括号内心活动扫描')
    expect(checks[0].evidence).toContain('他心想')
    expect(checks[0].fix).toContain('用行为暗示心理')
  })

  test('detects unsafe specific character-count expressions in prose craft checks', () => {
    const checks = scanSpecificCharacterCountExpressionRisks([
      '第8章 旧印',
      '',
      '林青禾只说：“门后有人。”这五个字一落，审判席全静了。',
      '短短四字砸下来，执事的手指停在账册边。',
      '三个字一落，门缝里的呼吸声忽然断了。',
    ].join('\n'))
    const safeChecks = scanSpecificCharacterCountExpressionRisks([
      '第8章 旧印',
      '',
      '林青禾只说：“门后有人。”这句话一落，审判席全静了。',
      '那几个字砸下来，执事的手指停在账册边。',
      '话音落下，门缝里的呼吸声忽然断了。',
    ].join('\n'))

    expect(checks).toHaveLength(3)
    expect(checks[0].label).toBe('具体字数表达扫描')
    expect(checks[0].evidence).toContain('这五个字')
    expect(checks[0].fix).toContain('这句话一落')
    expect(checks[0].fix).toContain('那几个字')
    expect(safeChecks).toHaveLength(0)
  })

  test('wires deterministic internal monologue risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicInternalMonologueChecks = scanInternalMonologueRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicInternalMonologueChecks')
  })

  test('wires deterministic specific character-count expression risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSpecificCharacterCountChecks = scanSpecificCharacterCountExpressionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSpecificCharacterCountChecks')
  })

  test('detects dialogue that turns into exposition instead of agenda or conflict', () => {
    const checks = scanDialogueInfodumpRisks([
      '第7章 管理员',
      '',
      '管理员推了推眼镜，说：“规则塔体系分为三层，第一层负责记录学生身份，第二层负责校验夜间行动权限，第三层会根据违规次数触发不同惩罚。这个机制来自旧校区契约，因此所有进入教学楼的人都会被自动纳入名单，通常只有管理员才能修改。”',
      '',
      '广播在他身后响了一声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_infodump_line_3')
    expect(checks[0].evidence).toContain('规则塔体系')
    expect(checks[0].fix).toContain('对白')
  })

  test('detects short consecutive science-mouth dialogue without pressure action or evidence', () => {
    const scienceMouthChecks = scanDialogueInfodumpRisks([
      '第7章 管理员',
      '"规则塔的权限分为三层，学生只能进入第一层。"',
      '"第二层负责校验夜间行动名单，第三层触发惩罚机制。"',
      '"这个体系来自旧校区契约，因此管理员通常能修改身份记录。"',
      '走廊里很安静，三个人都站在原地听完。',
    ].join('\n'))
    const embeddedChecks = scanDialogueInfodumpRisks([
      '第7章 管理员',
      '"为什么我的名字在第二层名单里？"',
      '管理员刚要开口，广播忽然响起，墙上的身份灯从白色跳成红色。',
      '"看见了吗？第二层只校验夜间行动，红灯说明有人刚改过你的权限。"',
      '李辰按住门锁，血从指缝里渗出来。',
    ].join('\n'))

    expect(scienceMouthChecks).toHaveLength(1)
    expect(scienceMouthChecks[0].key).toBe('dialogue_science_mouth_lines_2_4')
    expect(scienceMouthChecks[0].label).toBe('信息型配角科普嘴扫描')
    expect(scienceMouthChecks[0].evidence).toContain('权限分为三层')
    expect(scienceMouthChecks[0].fix).toContain('压力下挤出的半句话')
    expect(embeddedChecks).toHaveLength(0)
  })

  test('wires deterministic dialogue infodump risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueInfodumpChecks = scanDialogueInfodumpRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueInfodumpChecks')
  })

  test('detects authorial forecast lines that replace concrete page-turn hooks', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '李辰没有意识到，更大的风暴即将来临。',
      '命运的齿轮，也在这一刻开始转动。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].gate).toBe('G')
    expect(checks[0].pattern).toContain('作者预告')
    expect(checks[0].fix).toContain('现场')
  })

  test('detects explanatory causality that tells readers what the scene should mean', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '他之所以沉默，是因为终于明白名单背后的真相。',
      '原来所有人的退让，都只是为了等他亲手签下那张纸。',
      '',
      '门外的脚步声停住了。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].pattern).toContain('之所以')
    expect(checks[1].pattern).toContain('原来')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects author verdicts that tell readers how to judge a character', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '他就是这样薄情的人。',
      '她演得真好，连旁边的人都没有看出破绽。',
      '王婶笑得恰到好处，像早就排练过一样。',
    ].join('\n'))

    expect(checks).toHaveLength(3)
    expect(checks[0].pattern).toContain('替读者定性')
    expect(checks[0].fix).toContain('证据')
    expect(checks[2].pattern).toContain('评判性补语')
  })

  test('detects summarized character psychology that replaces body reaction', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '她明白，这一切都是命。',
      '他终于懂了，自己不过是名单上最轻的一笔。',
      '',
      '纸角从他指缝里滑下去。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].pattern).toContain('总结心理')
    expect(checks[0].fix).toContain('身体反应')
  })

  test('detects spoiled subtext and verdict metaphors that over-explain the scene', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '谁都看得出他在撒谎。',
      '那点笑她看得分明。',
      '那句话落下来，像在宣判一件早已定好的事。',
      '他望着她，像看一件死物。',
    ].join('\n'))

    expect(checks).toHaveLength(4)
    expect(checks[0].pattern).toContain('点破潜台词')
    expect(checks[2].pattern).toContain('定性比喻')
    expect(checks[0].fix).toContain('别点破')
  })

  test('detects god-view spoilers and hard backstory setup that break present-tense scene pressure', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '殊不知，门外那个人早已换了身份。',
      '多年以后，她才知道这一天其实早有预兆。',
      '关于规则塔的来历，要从十年前那场事故说起。',
      '为了理解这一切，必须从三年前的黑名单实验说起。',
    ].join('\n'))

    expect(checks).toHaveLength(4)
    expect(checks[0].pattern).toContain('上帝视角剧透')
    expect(checks[2].pattern).toContain('硬铺垫')
    expect(checks[2].fix).toContain('闪念')
  })

  test('detects essay-style transitions that pull prose out of the live scene', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '不难看出，规则塔的设计本质上是一套筛选机制。',
      '由此可见，李辰的反击并不是偶然。',
      '综上所述，这场审判已经进入新的阶段。',
      '诚然，黑名单仍然危险，因而他必须保持冷静。',
    ].join('\n'))

    expect(checks).toHaveLength(4)
    expect(checks[0].pattern).toContain('论文体')
    expect(checks[3].pattern).toContain('书面语连词')
    expect(checks[0].fix).toContain('现场')
  })

  test('detects professional diction stacks that make narration read like a report', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '规则塔的运行机制、惩罚结构和筛选逻辑组成完整体系。',
      '管理员进一步深入落实名单权限，推进夜巡制度升级。',
      '张智摸到门背后的三道刻痕，第三道还在渗水。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].pattern).toContain('去书面化')
    expect(checks[0].fix).toContain('白话')
    expect(checks[0].fix).toContain('现场')
    expect(checks[1].pattern).toContain('体制内动词')
  })

  test('detects inflated significance phrases that replace concrete consequences', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '这次选择意义深远。',
      '这是一场前所未有的胜利。',
      '可谓彻底改写了规则塔的格局。',
    ].join('\n'))

    expect(checks).toHaveLength(3)
    expect(checks[0].pattern).toContain('意义膨胀')
    expect(checks[0].fix).toContain('具体后果')
    expect(checks[2].fix).toContain('删掉')
  })

  test('wires deterministic authorial forecast risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicAuthorialForecastChecks = scanAuthorialForecastRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicAuthorialForecastChecks')
  })

  test('detects repeated subject sentence starts as mechanical Gate B prose', () => {
    const checks = scanRepeatedSubjectRisks([
      '第9章 名单之后',
      '',
      '李辰抬起头。李辰看见黑板上的名字。李辰伸手按住学生证。李辰没有说话。',
      '广播在窗外响了一声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('B')
    expect(checks[0].pattern).toContain('主语重复')
    expect(checks[0].evidence).toContain('李辰抬起头')
    expect(checks[0].fix).toContain('动作开句')
  })

  test('detects triple parallel phrasing that makes prose feel mechanically complete', () => {
    const checks = scanTripleParallelRisks([
      '第9章 名单之后',
      '',
      '他看见了黑板上的名字，听见了广播里的杂音，闻到了门缝里的铁锈味。',
      '张智把学生证按回桌面。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('B')
    expect(checks[0].pattern).toContain('三连排比')
    expect(checks[0].evidence).toContain('看见了黑板')
    expect(checks[0].fix).toContain('最有力的一条')
  })

  test('detects oh-story explicit parallel templates with three 有的 or 一边 clauses', () => {
    const crowdChecks = scanTripleParallelRisks([
      '第9章 名单之后',
      '',
      '有的人低头改名，有的人把学生证塞进口袋，有的人转身往楼梯跑。',
    ].join('\n'))
    const simultaneousChecks = scanTripleParallelRisks([
      '第9章 名单之后',
      '',
      '他一边稳住门后的锁，一边把名单塞给张智，一边盯着广播屏。',
      '她一边走一边说：“别回头。”',
    ].join('\n'))

    expect(crowdChecks).toHaveLength(1)
    expect(crowdChecks[0].pattern).toContain('三连排比')
    expect(crowdChecks[0].evidence).toContain('有的人低头改名')
    expect(simultaneousChecks).toHaveLength(1)
    expect(simultaneousChecks[0].evidence).toContain('一边稳住门后的锁')
    expect(simultaneousChecks[0].fix).toContain('最有力的一条')
  })

  test('wires deterministic repeated-subject risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicRepeatedSubjectChecks = scanRepeatedSubjectRisks(chapterText)')
    expect(reviewBlock).toContain('const deterministicTripleParallelChecks = scanTripleParallelRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicRepeatedSubjectChecks')
    expect(reviewBlock).toContain('...deterministicTripleParallelChecks')
  })

  test('detects repeated body or silence reactions as Gate C filler', () => {
    const checks = scanRepeatedReactionRisks([
      '第10章 留校名单',
      '',
      '李辰沉默了几秒，把名单推回桌面。',
      '张智看着广播灯，也沉默了下来。',
      '门外的人影贴住玻璃，李辰再次沉默。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('C')
    expect(checks[0].pattern).toContain('重复反应')
    expect(checks[0].evidence).toContain('沉默')
    expect(checks[0].fix).toContain('选择')
  })

  test('wires deterministic repeated-reaction risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicRepeatedReactionChecks = scanRepeatedReactionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicRepeatedReactionChecks')
  })

  test('detects flat short-sentence rhythm as Gate D pacing risk', () => {
    const checks = scanUniformRhythmRisks([
      '第11章 值夜名单',
      '',
      '李辰走到门前。张智看向窗外。广播响了一声。门外影子停住。名单落在桌上。灯光闪了一下。两人没有开口。走廊恢复安静。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('D')
    expect(checks[0].pattern).toContain('节奏均匀')
    expect(checks[0].evidence).toContain('李辰走到门前')
    expect(checks[0].fix).toContain('长短句')
  })

  test('wires deterministic uniform-rhythm risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicUniformRhythmChecks = scanUniformRhythmRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicUniformRhythmChecks')
  })

  test('detects generic explanatory dialogue tone as Gate E prose smell', () => {
    const checks = scanDialogueToneRisks([
      '第12章 管理员',
      '',
      '管理员说：“你要明白，这件事没有那么简单，也就是说规则背后还有另一套机制。”',
      '张智问：“另一套机制？”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('E')
    expect(checks[0].pattern).toContain('对话腔调')
    expect(checks[0].evidence).toContain('你要明白')
    expect(checks[0].fix).toContain('议程')
  })

  test('detects formal written diction in short dialogue that should sound spoken', () => {
    const checks = scanDialogueToneRisks([
      '第12章 管理员',
      '',
      '管理员说：“我认为此事不妥。”',
      '张智说：“这事不靠谱。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('E')
    expect(checks[0].pattern).toContain('对白书面语')
    expect(checks[0].evidence).toContain('我认为此事不妥')
    expect(checks[0].fix).toContain('我觉得不靠谱')
  })

  test('wires deterministic dialogue-tone risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueToneChecks = scanDialogueToneRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueToneChecks')
  })

  test('detects consecutive dialogue lines that share the same explanatory voice', () => {
    const checks = scanDialogueVoiceSamenessRisks([
      '第12章 管理员',
      '"所以这件事的关键在于门禁记录，而不是谁先到了走廊。"',
      '"所以这件事的关键在于广播时间，而不是你看到的影子。"',
      '"所以这件事的关键在于钥匙编号，而不是管理员说了什么。"',
      '"所以这件事的关键在于墙上的名单，而不是他们现在承认什么。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_voice_sameness_lines_2_5')
    expect(checks[0].label).toBe('角色声线趋同扫描')
    expect(checks[0].evidence).toContain('门禁记录')
    expect(checks[0].evidence).toContain('墙上的名单')
    expect(checks[0].fix).toContain('口癖')
    expect(checks[0].fix).toContain('身份措辞')
  })

  test('wires deterministic dialogue voice sameness risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueVoiceSamenessChecks = scanDialogueVoiceSamenessRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueVoiceSamenessChecks')
  })

  test('detects long uninterrupted dialogue runs without breathing beats', () => {
    const checks = scanDialogueBreathRisks([
      '第12章 管理员',
      '"你先别开门，门外的人知道我们的名字。"',
      '"可他还知道三楼的广播顺序。"',
      '"这说明他至少听过上一轮规则。"',
      '"也可能说明上一轮有人把记录交给了他。"',
      '"那我们现在要不要把钥匙藏起来？"',
      '"藏钥匙没用，编号已经被登记了。"',
      '"登记表在管理员手里。"',
      '"所以要先拿到登记表。"',
      '"拿不到呢？"',
      '"那就逼管理员自己拿出来。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_breath_lines_2_11')
    expect(checks[0].label).toBe('对白呼吸感扫描')
    expect(checks[0].evidence).toContain('你先别开门')
    expect(checks[0].evidence).toContain('逼管理员自己拿出来')
    expect(checks[0].fix).toContain('换气')
    expect(checks[0].fix).toContain('环境')
  })

  test('detects medium dialogue runs that miss action emotion breathing beats', () => {
    const brokenChecks = scanDialogueBreathRisks([
      '第12章 管理员',
      '"你先别开门，门外的人知道我们的名字。"',
      '"可他还知道三楼的广播顺序。"',
      '"这说明他至少听过上一轮规则。"',
      '"也可能说明上一轮有人把记录交给了他。"',
      '"那我们现在要不要把钥匙藏起来？"',
      '"藏钥匙没用，编号已经被登记了。"',
      '走廊尽头的红灯忽然闪了一下。',
    ].join('\n'))
    const anchoredChecks = scanDialogueBreathRisks([
      '第12章 管理员',
      '"你先别开门，门外的人知道我们的名字。"',
      '"可他还知道三楼的广播顺序。"',
      '张智把掌心压在门把上，先听了一次门外的呼吸声。',
      '"这说明他至少听过上一轮规则。"',
      '"也可能说明上一轮有人把记录交给了他。"',
      '"那我们现在要不要把钥匙藏起来？"',
      '"藏钥匙没用，编号已经被登记了。"',
    ].join('\n'))

    expect(brokenChecks).toHaveLength(1)
    expect(brokenChecks[0].key).toBe('dialogue_breath_lines_2_7')
    expect(brokenChecks[0].fix).toContain('动作')
    expect(brokenChecks[0].fix).toContain('身体反应')
    expect(anchoredChecks).toHaveLength(0)
  })

  test('wires deterministic dialogue breath risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueBreathChecks = scanDialogueBreathRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueBreathChecks')
  })

  test('detects dialogue sections that exceed oh-story dialogue density guidance', () => {
    const checks = scanDialogueDensityRisks([
      '第12章 管理员',
      '"你必须解释门禁记录为什么提前三分钟亮起，这不是巧合。"',
      '"我没有义务解释，你们现在应该先承认自己违反了夜巡规则。"',
      '"规则写的是不得离开宿舍，可名单上的名字是在走廊里消失的。"',
      '"名单只是名单，真正决定你们能不能活下去的是广播下一次播报。"',
      '"你又在绕开问题，门禁、名单、广播三件事不可能同时出错。"',
      '"我绕开的不是问题，是你们以为自己已经看懂了规则这件事。"',
      '"所以你知道真正的触发条件，却一直让我们在错误条件里试探。"',
      '"我知道的是，继续问下去，你们会比名单上的人更早消失。"',
      '"那就说明我们问对了。"',
      '管理员手里的钥匙停在半空，第一次没有立刻插进锁孔。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toContain('dialogue_density')
    expect(checks[0].label).toContain('对白篇幅')
    expect(checks[0].evidence).toContain('对白占比')
    expect(checks[0].fix).toContain('不超过全节 40%')
  })

})
