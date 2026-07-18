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

const readWritingServicePackageSource = () => [
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/quality/review-merge.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/quality/missing-review-checks.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delta-sync-reports.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-core.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8'),
].join('\n')

describe('normalizeSceneCardsPayload quality', () => {
  test('accepts multi-scene receipts when evidence is inside scene anchors', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '江辰把账册新证据亮在桌上',
          scene_end_anchor: '先指出盟约漏洞',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_start_anchor: '原本沉默的盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('flags multi-scene receipts when scene anchors cannot locate the scene text', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '不存在的账册开头',
          scene_end_anchor: '不存在的账册结尾',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_start_anchor: '原本沉默的盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_scope_invalid')
    expect(checks[0].evidence).toContain('scene_start_anchor/scene_end_anchor 无法定位')
    expect(checks[0].fix).toContain('修正场景锚点')
  })

  test('deduplicates generated scene breakdown when review context stores it twice', () => {
    const scene = {
      scene_no: 1,
      title: '账册亮相',
      scene_card_receipts: {
        goal_obstacle_change_delivered: true,
        purpose_tag_delivered: true,
        density_level_delivered: true,
        sensory_anchor_delivered: true,
        serial_risk_repairs_delivered: true,
        evidence: ['江辰把账册新证据亮在桌上'],
      },
    }

    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [scene],
      chapter_target: {
        generated_scene_breakdown: [scene],
      },
    }, '这一段只写风声和空桌，没有任何盟约动作。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_missing')
  })

  test('prefers latest generated scene breakdown over stale scene breakdown', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '修订后盟友改口',
          scene_start_anchor: '盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
      scene_breakdown: [
        {
          scene_no: 1,
          title: '旧版账册亮相',
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('keeps only verified scene-card receipts for story state sync', () => {
    const verified = verifiedSceneBreakdownForStateSync({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '江辰把账册新证据亮在桌上',
          scene_end_anchor: '先指出盟约漏洞',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '污染回执',
          scene_start_anchor: '原本沉默的盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['正文不存在的旧印归属变化'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧：“这次我跟你走。”',
    ].join('\n'))

    expect(verified).toHaveLength(1)
    expect(verified[0].title).toBe('账册亮相')
  })

  test('removes unverified scene-card receipts from story state sync context', () => {
    const context = buildStoryStateSyncContextPackage({
      chapter_target: {
        title: '旧盟约',
      },
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '江辰把账册新证据亮在桌上',
          scene_end_anchor: '先指出盟约漏洞',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '污染回执',
          scene_start_anchor: '原本沉默的盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['正文不存在的旧印归属变化'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧：“这次我跟你走。”',
    ].join('\n'))

    expect(context.generated_scene_breakdown).toHaveLength(1)
    expect(context.generated_scene_breakdown[0].title).toBe('账册亮相')
    expect(context.chapter_target.generated_scene_breakdown).toHaveLength(1)
    expect(JSON.stringify(context)).not.toContain('正文不存在的旧印归属变化')
  })

  test('removes unverified camelCase scene-card receipts from story state sync context', () => {
    const context = buildStoryStateSyncContextPackage({
      chapterTarget: {
        title: '旧盟约',
        generatedSceneBreakdown: [
          {
            sceneNo: 1,
            title: '污染回执',
            sceneStartAnchor: '原本沉默的盟友主动站到江辰身侧',
            sceneEndAnchor: '这次我跟你走',
            sceneCardReceipts: {
              goalObstacleChangeDelivered: true,
              purposeTagDelivered: true,
              densityLevelDelivered: true,
              sensoryAnchorDelivered: true,
              serialRiskRepairsDelivered: true,
              evidence: ['正文不存在的旧印归属变化'],
            },
          },
        ],
      },
    }, '原本沉默的盟友主动站到江辰身侧：“这次我跟你走。”')

    expect(context.generated_scene_breakdown).toHaveLength(0)
    expect(context.chapterTarget.generatedSceneBreakdown).toHaveLength(0)
    expect(JSON.stringify(context)).not.toContain('正文不存在的旧印归属变化')
  })

  test('keeps the previous scene breakdown when a candidate update has invalid receipts', () => {
    const previousBreakdown = [
      {
        scene_no: 1,
        title: '可信回执',
        scene_card_receipts: {
          goal_obstacle_change_delivered: true,
          purpose_tag_delivered: true,
          density_level_delivered: true,
          sensory_anchor_delivered: true,
          serial_risk_repairs_delivered: true,
          evidence: ['江辰把账册新证据亮在桌上'],
        },
      },
    ]
    const candidateBreakdown = [
      {
        scene_no: 1,
        title: '污染回执',
        scene_card_receipts: {
          goal_obstacle_change_delivered: true,
          purpose_tag_delivered: true,
          density_level_delivered: true,
          sensory_anchor_delivered: true,
          serial_risk_repairs_delivered: true,
          evidence: ['盟友递出不存在的旧印'],
        },
      },
    ]

    const selected = selectVerifiedSceneBreakdownUpdate(
      previousBreakdown,
      candidateBreakdown,
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
    )

    expect(selected).toBe(previousBreakdown)
  })

  test('wires deterministic scene-card receipt risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneCardReceiptChecks = scanSceneCardReceiptRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneCardReceiptChecks')
    expect(reviewBlock.indexOf('quality_audit_checks')).toBeLessThan(reviewBlock.indexOf('...deterministicSceneCardReceiptChecks'))
  })

  test('passes the authoritative generation contract into the prose quality loop', () => {
    const source = readWritingServicePackageSource()
    const helperSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8')
    const helperStart = helperSource.indexOf('export function buildProseReviewContextPackage')
    const helperBlock = helperSource.slice(
      helperStart,
      helperSource.indexOf('\nexport function', helperStart + 1),
    )
    const generationBlock = source.slice(
      source.indexOf('let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>'),
      source.indexOf('const initialReviewDecision = getQualityGateDecision'),
    )

    expect(helperBlock).toContain('generated_scene_breakdown')
    expect(generationBlock).toContain('coreContract: buildFocusedQualityCoreContract(generationContract)')
    expect(generationBlock).toContain('scan: text => scanProseForQualityLoop(text, contextPackage, wordTarget, wordTargetCompatibility ? {')
    expect(generationBlock).toContain('word_target_compatibility_pass: true')
    expect(generationBlock).toContain('compatibility_ceiling: wordTargetCompatibility.compatibility_ceiling')
  })

  test('wires deterministic scene-card density risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneDensityChecks = scanSceneDensityExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneDensityChecks')
  })

  test('wires deterministic scene-card purpose weight risks into quality audit self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicScenePurposeWeightChecks = scanScenePurposeWeightRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicScenePurposeWeightChecks')
    expect(reviewBlock.indexOf('quality_audit_checks')).toBeLessThan(reviewBlock.indexOf('...deterministicScenePurposeWeightChecks'))
  })

  test('wires deterministic scene-card sensory anchor risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneSensoryChecks = scanSceneSensoryAnchorRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneSensoryChecks')
  })

  test('wires deterministic scene-card serial risk repairs into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneSerialRiskRepairChecks = scanSceneSerialRiskRepairRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneSerialRiskRepairChecks')
    expect(reviewBlock.indexOf('serial_risk_repair_checks')).toBeLessThan(reviewBlock.indexOf('...deterministicSceneSerialRiskRepairChecks'))
  })

  test('wires deterministic scene-card consumption risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneCardChecks = buildSceneCardConsumptionChecks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneCardChecks')
  })

  test('detects oh-story blueprint craft gaps before prose is stored', () => {
    const checks = scanChapterBlueprintCraftRisks({
      chapter_target: {
        chapter_blueprint: {
          target_emotion: '压迫后反证爆发',
          core_payoff: '江辰用第二本账册当众反证，逼执事改口',
          content_outline: {
            climax: '执事在众目睽睽下改口，旁观弟子站队倒戈',
          },
          plot_lines: {
            logic_line: '旧账册 -> 第二本账册 -> 旧印章 -> 执事改口',
          },
        },
      },
    }, [
      '审判庭刚开场，江辰直接用第二本账册当众反证。',
      '旧印章证明账目被调换，执事在众目睽睽下改口，旁观弟子都很震惊。',
      '江辰洗清罪名，得到禁地钥匙线索。',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'blueprint_craft_payoff_setup',
      'blueprint_craft_differentiated_reactions',
      'blueprint_craft_detail_balance',
    ]))
    expect(checks.map((item: any) => item.label)).toContain('爽点铺垫')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('爽点/高潮出手前必须先铺')
  })

  test('detects blueprint craft gaps from stored oh-story delivery receipts', () => {
    const checks = scanChapterBlueprintCraftRisks({
      chapter_target: {
        delivery_receipts: {
          chapter_blueprint: {
            target_emotion: '压迫后反证爆发',
            core_payoff: '江辰用第二本账册当众反证，逼执事改口',
            content_outline: {
              climax: '执事在众目睽睽下改口，旁观弟子站队倒戈',
            },
            plot_lines: {
              logic_line: '旧账册 -> 第二本账册 -> 旧印章 -> 执事改口',
            },
          },
        },
      },
    }, [
      '审判庭刚开场，江辰直接用第二本账册当众反证。',
      '旧印章证明账目被调换，执事在众目睽睽下改口，旁观弟子都很震惊。',
      '江辰洗清罪名，得到禁地钥匙线索。',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toContain('blueprint_craft_payoff_setup')
    expect(checks.map((item: any) => item.label)).toContain('爽点铺垫')
  })

  test('detects chapter blueprint character order mismatches', () => {
    const checks = scanCharacterOrderExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          character_order: ['会长', '林青禾', '李玄'],
        },
      },
    }, [
      '李玄先把旧账册按在桌上，压住所有人的视线。',
      '会长这才从主位抬头，冷声问他凭什么进审判庭。',
      '林青禾站在门边，迟疑片刻才走到证人席。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('character_order_mismatch')
    expect(checks[0].label).toBe('人物出场顺序扫描')
    expect(checks[0].evidence).toContain('计划：会长 -> 林青禾 -> 李玄')
    expect(checks[0].evidence).toContain('实际：李玄 -> 会长 -> 林青禾')
    expect(checks[0].fix).toContain('镜头进入顺序')
  })

  test('does not flag character order when prose follows the blueprint', () => {
    const checks = scanCharacterOrderExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          character_order: ['会长', '林青禾', '李玄'],
        },
      },
    }, [
      '会长坐在主位上，指尖敲着旧账册的封皮。',
      '林青禾被带到证人席，袖口还压着昨夜留下的泥点。',
      '李玄最后踏进审判庭，把第二本账册放在所有人面前。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic character order risks into intent confirmation checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCharacterOrderChecks = scanCharacterOrderExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicCharacterOrderChecks')
  })

  test('detects missing or out-of-order chapter blueprint beat sequence', () => {
    const checks = scanBeatSequenceExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          beat_sequence: [
            { beat_no: 1, action: '会长当众压问林青禾', function_tag: '铺垫压力' },
            { beat_no: 2, action: '林青禾交出旧账册缺页', function_tag: '信息差反转' },
            { beat_no: 3, action: '李玄用第二本账册反证会长', function_tag: '爽点兑现' },
          ],
        },
      },
    }, [
      '李玄先把第二本账册摊在审判桌上，当众反证会长。',
      '会长脸色一沉，这才开始压问林青禾。',
      '林青禾始终攥着袖口，没有交出旧账册缺页。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('beat_sequence_missing_and_out_of_order')
    expect(checks[0].label).toBe('情节点序列扫描')
    expect(checks[0].evidence).toContain('缺失：2.信息差反转')
    expect(checks[0].evidence).toContain('乱序')
    expect(checks[0].fix).toContain('谁做了什么')
    expect(checks[0].fix).toContain('功能标签')
  })

  test('does not flag beat sequence when planned beats are delivered in order', () => {
    const checks = scanBeatSequenceExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          beat_sequence: [
            { beat_no: 1, action: '会长当众压问林青禾', function_tag: '铺垫压力' },
            { beat_no: 2, action: '林青禾交出旧账册缺页', function_tag: '信息差反转' },
            { beat_no: 3, action: '李玄用第二本账册反证会长', function_tag: '爽点兑现' },
          ],
        },
      },
    }, [
      '会长当众压问林青禾，逼她说明昨夜为何进过账房。',
      '林青禾把袖中的旧账册缺页交出来，缺页上的编号立刻形成信息差反转。',
      '李玄接过缺页，用第二本账册反证会长，让审判庭的局势彻底翻过来。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic beat sequence risks into intent confirmation checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicBeatSequenceChecks = scanBeatSequenceExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicBeatSequenceChecks')
  })

  test('detects missing cost when chapter blueprint only delivers the reward', () => {
    const checks = scanCostRewardExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          cost_and_reward: '代价：林青禾公开得罪会长；收益：李玄夺回审讯解释权。',
        },
      },
    }, [
      '李玄把旧账册按在桌上，会长被迫改口。',
      '审讯席上的解释权终于回到李玄手里，他夺回了所有人的视线。',
      '林青禾站在旁边，没有开口。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('cost_reward_missing_cost')
    expect(checks[0].label).toBe('代价/收益兑现扫描')
    expect(checks[0].evidence).toContain('计划代价：林青禾公开得罪会长')
    expect(checks[0].evidence).toContain('计划收益：李玄夺回审讯解释权')
    expect(checks[0].fix).toContain('谁付出代价')
    expect(checks[0].fix).toContain('谁获得收益')
  })

  test('does not flag cost reward execution when both sides are visible', () => {
    const checks = scanCostRewardExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          cost_and_reward: '代价：林青禾公开得罪会长；收益：李玄夺回审讯解释权。',
        },
      },
    }, [
      '林青禾当着所有人的面走出旁听席，公开作证，等于当场得罪会长。',
      '李玄抓住她递出的账册编号，把审讯解释权重新夺回手里。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic cost reward risks into intent confirmation checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCostRewardChecks = scanCostRewardExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicCostRewardChecks')
  })

  test('detects local victories that close without a new cost or risk', () => {
    const checks = scanLocalVictoryCostRisks([
      '第12章 资格门',
      '',
      '李玄把最后一枚阵牌按进门缝，红光熄灭，资格门终于通过。',
      '',
      '执事退后一步，众人松了一口气，这一关总算赢了。',
      '',
      '他拿到奖励，回到住处休息。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('local_victory_without_cost_1_3')
    expect(checks[0].label).toBe('局部胜利代价扫描')
    expect(checks[0].evidence).toContain('资格门终于通过')
    expect(checks[0].fix).toContain('新的代价')
    expect(checks[0].fix).toContain('风险')
  })

  test('does not flag local victories that open a new cost risk or next pressure', () => {
    const checks = scanLocalVictoryCostRisks([
      '第12章 资格门',
      '',
      '李玄把最后一枚阵牌按进门缝，红光熄灭，资格门终于通过。',
      '',
      '但阵牌背面的旧印也随之暴露，执事记下他的名字，下一轮核验被提前到十息之后。',
      '',
      '他拿到奖励，却必须立刻赶去禁库，否则林青禾会被取消作证资格。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic local victory cost risks into plot dynamics checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicLocalVictoryCostChecks = scanLocalVictoryCostRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicLocalVictoryCostChecks')
  })

  test('wires deterministic blueprint craft risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicBlueprintCraftChecks = scanChapterBlueprintCraftRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicBlueprintCraftChecks')
  })

  test('turns missing source readiness rows into deterministic state tracking checks', () => {
    const checks = buildSourceReadinessChecks({
      chapter_target: {
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              evidence: '',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '只有角色名，没有当前位置和认知边界。',
              fix: '补齐本章出场角色状态。',
            },
            {
              key: 'world_constraints',
              label: '世界约束',
              status: 'ready',
              evidence: '禁门规则已就绪。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].status).toBe('fail')
    expect(checks[0].fix).toContain('补齐上一章')
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].status).toBe('warn')
    expect(checks.map(item => item.key)).not.toContain('source_readiness_world_constraints')
  })

  test('reads runtime camelCase chapterTarget source readiness rows for deterministic checks', () => {
    const checks = buildSourceReadinessChecks({
      chapterTarget: {
        stateTrackingContract: {
          sourceReadiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '缺当前位置和认知边界。',
              fix: '补齐本章出场角色状态。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].status).toBe('fail')
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].status).toBe('warn')
  })

  test('turns critical missing source readiness rows into prose preflight blockers', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '缺认知边界。',
              fix: '补齐本章出场角色状态。',
            },
            {
              key: 'world_constraints',
              label: '世界约束',
              status: 'ready',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].severity).toBe('high')
    expect(checks[0].ok).toBe(false)
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].severity).toBe('medium')
  })

  test('reads runtime camelCase chapterTarget source readiness rows for prose preflight blockers', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapterTarget: {
        stateTrackingContract: {
          sourceReadiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '缺认知边界。',
              fix: '补齐本章出场角色状态。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].severity).toBe('high')
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].severity).toBe('medium')
  })

  test('requires timeline tracking when daily workflow source requirements mention timeline', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 8,
        state_tracking_contract: {
          source_requirements: ['追踪/上下文.md', '追踪/伏笔.md', '追踪/时间线.md'],
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'ready',
              evidence: '上一章以旧楼门牌变化收束。',
            },
            {
              key: 'context_tracking',
              label: '追踪/上下文',
              status: 'ready',
              evidence: '最近状态摘要已加载。',
            },
            {
              key: 'foreshadowing_history',
              label: '伏笔/前史',
              status: 'ready',
              evidence: '旧楼门牌伏笔已筛选。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('source_readiness_timeline_tracking')
    expect(checks[0].severity).toBe('medium')
    expect(checks[0].label).toBe('追踪/时间线')
    expect(checks[0].fix).toContain('追踪/时间线.md')
  })

  test('requires all daily workflow source requirements to have readiness rows', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 8,
        chapter_blueprint: {
          target_emotion: '紧张追查',
          opening_hook: '旧楼门牌变化。',
          core_payoff: '确认门牌变化来源。',
          content_outline: {
            cause: '门牌变化',
            development: '核对线索',
            turn: '时间戳提前',
            climax: '规则阻止开门',
            ending: '新时间戳出现',
          },
          plot_lines: {
            mainline: '追查旧楼门牌变化',
            logic_line: '门牌变化 -> 时间戳 -> 规则判定',
          },
          character_order: ['李玄', '林青禾'],
          beat_sequence: ['核对门牌', '发现时间戳', '阻止开门'],
          cost_and_reward: '代价：错过安全窗口；收益：确认规则。',
          ending_contract: {
            next_chapter_pull: '新时间戳指向下一处门牌。',
          },
        },
        state_tracking_contract: {
          source_requirements: [
            '本章细纲/场景卡',
            '上一章正文或上一章承接',
            '追踪/上下文.md',
            '追踪/伏笔.md',
            '追踪/时间线.md',
            '追踪/角色状态.md',
          ],
          source_readiness: [
            {
              key: 'chapter_blueprint',
              label: '本章细纲/场景卡',
              status: 'ready',
              evidence: '第8章蓝图已确认。',
            },
          ],
        },
      },
    })

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'source_readiness_previous_chapter',
      'source_readiness_context_tracking',
      'source_readiness_foreshadowing_tracking',
      'source_readiness_timeline_tracking',
      'source_readiness_character_state',
    ]))
    expect(checks.find((item: any) => item.key === 'source_readiness_previous_chapter')?.severity).toBe('high')
    expect(checks.find((item: any) => item.key === 'source_readiness_context_tracking')?.label).toBe('追踪/上下文')
    expect(checks.find((item: any) => item.key === 'source_readiness_foreshadowing_tracking')?.fix).toContain('追踪/伏笔.md')
    expect(checks.find((item: any) => item.key === 'source_readiness_character_state')?.fix).toContain('追踪/角色状态.md')
  })

  test('requires daily workflow ready source rows to carry concrete evidence', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 9,
        state_tracking_contract: {
          source_requirements: [
            '上一章正文或上一章承接',
            '追踪/角色状态.md',
          ],
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'ready',
              evidence: '',
            },
            {
              key: 'character_state',
              label: '追踪/角色状态',
              status: 'ready',
            },
          ],
        },
      },
    })

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'source_readiness_previous_chapter',
      'source_readiness_character_state',
    ]))
    expect(checks.find((item: any) => item.key === 'source_readiness_previous_chapter')?.severity).toBe('high')
    expect(checks.find((item: any) => item.key === 'source_readiness_previous_chapter')?.evidence).toContain('缺少 evidence')
    expect(checks.find((item: any) => item.key === 'source_readiness_character_state')?.fix).toContain('角色状态')
  })

  test('builds source readiness sync report from write-prep source gaps', () => {
    const okReport = buildSourceReadinessSyncReport(
      { title: '旧楼规则' },
      { id: 7, chapter_no: 7, title: '旧楼门牌' },
      {
        chapter_target: {
          chapter_blueprint: {
            target_emotion: '紧张追查',
            opening_hook: '旧楼门牌在子夜前变化。',
            core_payoff: '确认门牌变化来自上一章最后一幕。',
            content_outline: {
              cause: '旧楼门牌变化',
              development: '主角核对上一章线索',
              turn: '时间戳提前',
              climax: '规则判定阻止开门',
              ending: '新时间戳出现',
            },
            plot_lines: {
              mainline: '追查旧楼门牌变化',
              logic_line: '门牌变化 -> 时间戳 -> 规则判定',
            },
            character_order: ['主角', '林晓'],
            beat_sequence: ['核对线索', '验证时间', '规则阻止'],
            cost_and_reward: '代价是不能直接开门，收益是确认时间戳。',
            ending_contract: { next_chapter_pull: '时间戳指向下一次旧楼开门。' },
          },
          state_tracking_contract: {
            source_requirements: ['本章细纲/场景卡', '上一章正文', '追踪/时间线.md'],
            source_readiness: [
              { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '五段式、代价收益、章尾承接已确认。' },
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '旧楼门牌变化已读取。' },
              { key: 'timeline_tracking', label: '追踪/时间线', status: 'ready', evidence: '当前时间为子夜前。' },
            ],
          },
        },
      },
      '旧楼门牌变化被接住，当前时间仍是子夜前。',
    )
    const warnReport = buildSourceReadinessSyncReport(
      { title: '旧楼规则' },
      { id: 8, chapter_no: 8, title: '缺源测试' },
      {
        chapter_target: {
          state_tracking_contract: {
            source_requirements: ['本章细纲/场景卡', '上一章正文', '追踪/时间线.md'],
            source_readiness: [
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'missing', fix: '补齐上一章正文、摘要或章尾钩子。' },
              { key: 'character_state', label: '角色状态', status: 'warn', evidence: '只有角色名，没有当前位置和认知边界。' },
            ],
          },
        },
      },
      '正文直接依赖上一章和角色状态，但写前来源未就绪。',
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('来源就绪 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('来源就绪缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章正文/章尾钩子', '角色状态', '追踪/时间线']))
    expect(warnReport.next_actions.join('；')).toMatch(/补齐|未就绪来源|既定事实/)
  })

  test('warns when source readiness ready rows use generic evidence', () => {
    const report = buildSourceReadinessSyncReport(
      { title: '旧楼规则' },
      { id: 9, chapter_no: 9, title: '泛化来源' },
      {
        chapter_target: {
          state_tracking_contract: {
            source_requirements: ['上一章正文'],
            source_readiness: [
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '已读取' },
            ],
          },
        },
      },
      '旧楼门牌变化被接住。',
    )

    expect(report.status).toBe('warn')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'source_readiness_previous_chapter',
      label: '上一章正文/章尾钩子',
    })
    expect(report.missed[0].evidence).toContain('泛化')
  })

  test('reads raw camelCase source readiness after delivery', () => {
    const report = buildSourceReadinessSyncReport(
      { title: '旧楼规则' },
      {
        id: 35,
        chapter_no: 35,
        title: '倒放录音',
        raw_payload: {
          preDraftBrief: {
            stateTrackingContract: {
              sourceRequirements: ['上一章正文', '追踪/时间线.md'],
              sourceReadiness: [
                { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '上一章以磁带倒放收束。' },
                { key: 'timeline_tracking', label: '追踪/时间线', status: 'ready', evidence: '当前时间为子夜后第三分钟。' },
                { key: 'character_state', label: '角色状态', status: 'warn', evidence: '缺李超听到未来回答后的认知边界。', fix: '补齐李超当前认知边界。' },
              ],
            },
          },
        },
      },
      {},
      '李超听见倒放录音，意识到自己处在子夜后第三分钟。',
    )

    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章正文/章尾钩子', '追踪/时间线', '角色状态']))
    expect(report.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章正文/章尾钩子', '追踪/时间线']))
    expect(report.missed.map((item: any) => item.label)).toContain('角色状态')
    expect(report.status).toBe('warn')
  })

  test('story state sync persists a source_readiness_sync review', () => {
    const source = readWritingServicePackageSource()

    expect(source).toContain("reviewType: 'source_readiness_sync', payloadKey: 'source_readiness_sync'")
    expect(source).toContain('buildSourceReadinessSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.source_readiness_sync = sourceReadinessSync')
  })

  test('builds prose meta sync report from deterministic prose meta leaks', () => {
    const okReport = buildProseMetaSyncReport(
      { title: '袖口旧印' },
      { id: 15, chapter_no: 15, title: '袖口旧印' },
      {},
      [
        '第十五章 袖口旧印',
        '林青禾按住袖口，那枚旧印硌着掌心。',
        '账册夹页被水洇开，露出三年前封存的半枚火漆。',
      ].join('\n'),
    )
    const warnReport = buildProseMetaSyncReport(
      { title: '袖口旧印' },
      { id: 15, chapter_no: 15, title: '袖口旧印' },
      {},
      [
        '第十五章 袖口旧印',
        '林青禾按住袖口，想起上一章那枚旧印。',
        '账册夹页里还藏着一处伏笔，读者会在这里明白代价。',
      ].join('\n'),
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('正文元信息 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('正文元信息缺口')
    expect(warnReport.missed.map((item: any) => item.term)).toEqual(['上一章', '伏笔', '读者'])
    expect(warnReport.next_actions.join('；')).toContain('角色当下能感知')
  })

  test('allows in-world chapter references while still flagging authorial chapter meta', () => {
    const allowed = scanProseMetaLeaks([
      '第十六章 禁门旧档',
      '林青禾翻到《禁门录》第三章，指尖停在“夜半不得回头”那一行。',
      '她把书页推到李玄面前：“这一章不是写给弟子的，是写给守门人的。”',
    ].join('\n'))
    const warned = scanProseMetaLeaks([
      '第十六章 禁门旧档',
      '林青禾按住袖口，比第一章那三秒开火更疼。',
      '这处伏笔应该让读者明白代价。',
    ].join('\n'))

    expect(allowed).toHaveLength(0)
    expect(warned.map((item: any) => item.term)).toEqual(['第一章', '伏笔', '读者'])
  })

  test('story state sync persists a prose_meta_sync review', () => {
    const source = readWritingServicePackageSource()

    expect(source).toMatch(/reviewType: 'prose_meta_sync'[\s\S]*payloadKey: 'prose_meta_sync'/)
    expect(source).toContain('buildProseMetaSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.prose_meta_sync = proseMetaSync')
  })

  test('treats incomplete chapter blueprint structure as a hard prose preflight gap', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'chapter_blueprint',
              label: '本章细纲/蓝图',
              status: 'ready',
              evidence: '只有章节摘要和场景卡。',
            },
          ],
        },
        chapter_blueprint: {
          version: 'oh_story_chapter_blueprint_v1',
          content_outline: {
            cause: '主角被逼到审判庭。',
          },
          plot_lines: {
            mainline: '主角反证旧账册。',
          },
        },
      },
    })

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      key: 'source_readiness_chapter_blueprint',
      severity: 'high',
      ok: false,
    })
    expect(checks[0].fix).toContain('目标情绪')
    expect(checks[0].fix).toContain('核心回报')
    expect(checks[0].fix).toContain('章尾承接')
  })

  test('allows legacy outlines missing new blueprint fields as nonblocking backfill warnings', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 18,
        title: '旧账落印',
        chapter_goal: '李玄用旧账缺页反证会长换证。',
        summary: '会长三轮压问，李玄用旧账缺页和袖口暗纹反证。',
        emotional_curve: '压迫 -> 反证 -> 余波',
        opening_hook: '雨夜旧账第一行金额不对。',
        reader_payoff: '李玄夺回审讯解释权。',
        ending_hook: '旧账缺页背后出现内门编号。',
        word_target: 3200,
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'chapter_blueprint',
              label: '本章细纲/蓝图',
              status: 'ready',
              evidence: '旧版细纲已有核心事件、目标情绪、章首钩子、爽点、章尾钩子和字数目标。',
            },
          ],
        },
      },
    })

    const blueprintCheck = checks.find((item: any) => item.key === 'source_readiness_chapter_blueprint')

    expect(blueprintCheck).toBeTruthy()
    expect(blueprintCheck).toMatchObject({
      key: 'source_readiness_chapter_blueprint',
      severity: 'medium',
      ok: false,
    })
    expect(blueprintCheck.fix).toContain('不阻塞日更')
    expect(blueprintCheck.fix).toContain('按新版模板回填')
    expect(blueprintCheck.fix).toContain('[待补充]')
    expect(blueprintCheck.fix).toContain('不要杜撰副线或人物关系')
    expect(blueprintCheck.evidence).toContain('旧版细纲')
  })

  test('blocks prose preflight when scene cards lack goal obstacle or state change', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 1,
        title: '旧楼门牌',
        scene_cards: [
          {
            scene_no: 1,
            title: '旧楼走廊',
            purpose: '李辰和张智进入旧楼。',
            beat: '两人观察门牌和走廊环境。',
          },
        ],
      },
    })

    const sceneCheck = checks.find((item: any) => item.key === 'source_readiness_scene_card_goal_obstacle_change')
    expect(sceneCheck).toBeTruthy()
    expect(sceneCheck).toMatchObject({
      ok: false,
      severity: 'high',
      label: '场景卡戏剧单元',
    })
    expect(sceneCheck.fix).toContain('目标')
    expect(sceneCheck.fix).toContain('阻碍')
    expect(sceneCheck.fix).toContain('变化')
    expect(sceneCheck.evidence).toContain('旧楼走廊')
  })

  test('accepts scene cards that declare goal obstacle and state change before prose', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 1,
        title: '旧楼门牌',
        scene_cards: [
          {
            scene_no: 1,
            title: '门牌核验',
            purpose: '李辰必须在十秒内找到正确门牌。',
            conflict: '管理员堵在楼梯口，禁止没有权限的人进入档案室。',
            turning_point: '钥匙插入反向锁孔后，门牌变成档案室编号。',
            exit_state: '李辰获得临时权限，下一轮核验提前。',
          },
        ],
      },
    })

    expect(checks.some((item: any) => item.key === 'source_readiness_scene_card_goal_obstacle_change')).toBe(false)
  })

  test('adds timeline tracking to generated state source readiness rows', () => {
    const brief = buildChapterPreDraftBrief({ title: '日更长篇' }, {
      chapter_target: {
        chapter_no: 8,
        title: '旧楼门牌',
        summary: '主角追查旧楼门牌变化。',
        conflict: '时间顺序决定谁在撒谎。',
        ending_hook: '门牌上的日期比今天晚一天。',
        scene_cards: [{ title: '门牌核对', purpose: '确认事件顺序。', conflict: '记录和记忆冲突。' }],
      },
      continuity: {
        previous_chapter: {
          chapter_no: 7,
          summary: '上一章发现旧楼门牌被换过。',
          ending_hook: '门牌日期出现异常。',
        },
      },
      story_state: {
        characters: [{ name: '李辰', current_state: { location: '旧楼门口', knowledge_scope: '知道门牌异常' } }],
        timeline: ['第七章夜里，门牌第一次变号。'],
      },
    })

    const row = brief.state_tracking_contract.source_readiness.find((item: any) => item.key === 'timeline_tracking')
    expect(row).toBeTruthy()
    expect(row.label).toBe('追踪/时间线')
    expect(row.status).toBe('ready')
    expect(row.evidence).toContain('门牌第一次变号')
  })

  test('detects paragraphs that stall without action, dialogue, choice, or information change', () => {
    const checks = scanParagraphProgressionRisks([
      '第4章 旧楼走廊',
      '',
      '走廊尽头的灯罩蒙着灰，暗黄的光落在墙皮裂缝上。',
      '',
      '空气里有潮湿的味道，像旧木柜被雨水泡过很多年。',
      '',
      '窗外的树影贴着玻璃摇晃，整个楼层安静得只剩下风声。',
      '',
      '李辰站在门口，心里生出一种说不清的压迫感。',
    ].join('\n'))

    expect(checks.some(item => item.key === 'consecutive_atmosphere_paragraphs')).toBe(true)
    expect(checks.some(item => item.key === 'paragraph_progression_stall_1')).toBe(true)
    expect(checks[0].fix).toContain('动作、选择、信息变化')
  })

  test('detects meaning-inflation filler without concrete consequence or event progression', () => {
    const fillerChecks = scanMeaningInflationFillerRisks([
      '第4章 旧楼走廊',
      '',
      '这一刻，李辰终于意识到自己肩上的责任比想象中更沉重，这份选择也拥有了前所未有的意义。',
      '',
      '他明白，命运已经在无声处改变，过去所有经历都在此刻汇成了一种难以言说的重量。',
      '',
      '这种成长让他变得更加坚定，也让眼前的一切显得意义深远，仿佛未来终于有了新的方向。',
    ].join('\n'))
    const concreteChecks = scanMeaningInflationFillerRisks([
      '第4章 旧楼走廊',
      '',
      '李辰把钥匙压进门缝，锁芯却反向咬住他的手指。',
      '',
      '"别开！名单变红了。"林青禾抓住他的袖口。',
      '',
      '广播在头顶响起，第三层门牌从白色跳成红色，周薄森当场退到楼梯口。',
    ].join('\n'))

    expect(fillerChecks).toHaveLength(1)
    expect(fillerChecks[0].key).toBe('meaning_inflation_filler_paragraphs_1_3')
    expect(fillerChecks[0].label).toBe('意义膨胀水文扫描')
    expect(fillerChecks[0].evidence).toContain('意义深远')
    expect(fillerChecks[0].fix).toContain('具体后果')
    expect(concreteChecks).toHaveLength(0)
  })

  test('wires deterministic meaning-inflation filler risks into quality audit hard risks', () => {
    const source = readWritingServicePackageSource()
    const qualityAuditBlock = source.slice(
      source.indexOf('function buildQualityAuditDeterministicCheck'),
      source.indexOf('function qualityAuditPriority', source.indexOf('function buildQualityAuditDeterministicCheck')),
    )

    expect(qualityAuditBlock).toContain('...scanMeaningInflationFillerRisks(chapterText)')
  })

  test('wires deterministic paragraph progression risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphProgressionChecks = scanParagraphProgressionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphProgressionChecks')
  })

  test('detects narrative transition glue between sub-events', () => {
    const checks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '然后我翻到下一页。',
      '',
      '接着他把校规重新解释了一遍，众人才明白这条规则有多危险。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['narrative_transition_glue_line_1', 'narrative_transition_glue_line_2'])
    expect(checks[0].label).toBe('子事件连接扫描')
    expect(checks[0].evidence).toContain('然后我翻到下一页')
    expect(checks[0].fix).toContain('身体动作')
    expect(checks[0].fix).toContain('物件动作')
  })

  test('does not flag body-action connectors or dialogue questions as narrative transition glue', () => {
    const checks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '我把账本搁在膝盖上，手心出一层薄汗。',
      '',
      '“然后呢？”林岚盯着账页边缘的墨痕问。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects time and space jumps without oh-story sensory anchors', () => {
    const checks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '三天后，众人已经到了赤炉城。',
      '',
      '另一边，林青禾已经站在后院。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['time_jump_anchor_missing_line_1', 'space_jump_anchor_missing_line_2'])
    expect(checks[0].fix).toContain('动作或物件')
    expect(checks[1].fix).toContain('声音或光影')
  })

  test('does not flag time or space jumps when action object sound or light anchors are visible', () => {
    const checks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '三天后，李玄推开赤炉城门，掌心的封条被汗浸软。',
      '',
      '另一边，铜铃在后院檐下响了三声，林青禾循着灯影推门进去。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic narrative transition risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicNarrativeTransitionChecks = scanNarrativeTransitionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicNarrativeTransitionChecks')
  })

  test('asks prose self review and revision to enforce oh-story sub-event connectors', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('子事件连接')
    expect(reviewPrompt).toContain('不用叙述过渡')
    expect(reviewPrompt).toContain('身体动作')
    expect(revisionPrompt).toContain('子事件连接')
    expect(revisionPrompt).toContain('叙述过渡')
    expect(revisionPrompt).toContain('身体动作、物件动作')
  })

  test('detects scenes without visible goal obstacle or state change', () => {
    const checks = scanSceneGoalObstacleChangeRisks([
      '第4章 旧楼走廊',
      '',
      '李辰站在旧楼走廊里，墙上的灯一盏接一盏亮起。',
      '',
      '张智看着门牌，门牌上的数字慢慢变得模糊。',
      '',
      '楼下传来风声，空气里有一股潮湿的铁锈味。',
      '',
      '两个人都没有说话，只觉得这里比刚才更冷。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_goal_obstacle_change_missing')
    expect(checks[0].label).toBe('场景目标阻碍变化扫描')
    expect(checks[0].evidence).toContain('缺少目标')
    expect(checks[0].fix).toContain('人物要什么')
    expect(checks[0].fix).toContain('什么挡着')
    expect(checks[0].fix).toContain('结束后不同')
  })

  test('does not flag scenes with a goal obstacle and changed state', () => {
    const checks = scanSceneGoalObstacleChangeRisks([
      '第4章 旧楼走廊',
      '',
      '李辰必须在十秒内找到正确门牌，否则张智的名字会从名单上消失。',
      '',
      '管理员堵在楼梯口，抬手按住感应器：“没有权限的人不能进档案室。”',
      '',
      '李辰把刚拿到的钥匙插进反向锁孔，门牌从404变成了档案室编号。',
      '',
      '广播随即改口：“临时权限已生效，下一轮核验提前。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic scene goal obstacle change risks into quality audit self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneGoalObstacleChangeChecks = scanSceneGoalObstacleChangeRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneGoalObstacleChangeChecks')
  })

  test('detects combat scenes that skip action process and only report the result', () => {
    const checks = scanCombatProcessRisks([
      '第12章 试炼台',
      '',
      '李玄拔剑冲上去。',
      '',
      '一招过后，执事倒在地上，战斗结束。',
      '',
      '台下众人全都安静下来。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('combat_process_missing_1_3')
    expect(checks[0].label).toBe('战斗过程扫描')
    expect(checks[0].evidence).toContain('一招过后')
    expect(checks[0].fix).toContain('起手')
    expect(checks[0].fix).toContain('对手反应')
    expect(checks[0].fix).toContain('空间')
    expect(checks[0].fix).toContain('反制')
  })

  test('does not flag combat scenes with action reaction space and result', () => {
    const checks = scanCombatProcessRisks([
      '第12章 试炼台',
      '',
      '李玄侧身避开阵光，剑尖贴着石阶挑起火星。',
      '',
      '执事抬臂格挡，袖口被划开，脚跟撞上台阶边缘。',
      '',
      '李玄借台阶换位，反手刺穿阵眼。',
      '',
      '阵光熄灭，执事踉跄退后，手里的名册掉在地上。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic combat process risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCombatProcessChecks = scanCombatProcessRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicCombatProcessChecks')
  })

  test('detects over-fragmented short narration lines as prose craft risks', () => {
    const checks = scanParagraphFragmentationRisks([
      '第4章 旧楼走廊',
      '门开了。',
      '风进来。',
      '灯灭了。',
      '李辰停住。',
      '没人说话。',
      '水迹停在脚边。',
      '"别动。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('paragraph_over_fragmented_short_lines')
    expect(checks[0].label).toBe('段落碎片化扫描')
    expect(checks[0].evidence).toContain('门开了')
    expect(checks[0].evidence).toContain('水迹停在脚边')
    expect(checks[0].fix).toContain('合并')
    expect(checks[0].fix).toContain('戏剧单元')
  })

  test('wires deterministic paragraph fragmentation risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphFragmentationChecks = scanParagraphFragmentationRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphFragmentationChecks')
  })

  test('detects uniform paragraph lengths that flatten mobile reading rhythm', () => {
    const checks = scanParagraphLengthUniformityRisks([
      '第4章 旧楼走廊',
      '李辰停在门边，看见水迹贴着门缝往里渗。',
      '张智抬手按住门锁，指节被冷气冻得发白。',
      '走廊那头没有脚步声，只有广播滋滋作响。',
      '门外学生把校牌举高，名字被水泡得发胀。',
      '宿舍里的人都屏住呼吸，没人敢先开口。',
      '墙上的钟停在十二点，秒针却还在轻轻颤。',
      '李辰把那张旧照片翻过来，看见背面多了字。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('paragraph_length_uniformity')
    expect(checks[0].label).toBe('段落长短节奏扫描')
    expect(checks[0].evidence).toContain('李辰停在门边')
    expect(checks[0].evidence).toContain('背面多了字')
    expect(checks[0].fix).toContain('长短交错')
    expect(checks[0].fix).toContain('疏密')
  })

  test('wires deterministic paragraph length uniformity risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphLengthUniformityChecks = scanParagraphLengthUniformityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphLengthUniformityChecks')
  })

  test('detects comma-chain paragraphs that are too dense to read in one breath', () => {
    const checks = scanParagraphCommaChainDensityRisks([
      '第4章 雨夜',
      '',
      '他看着窗外的雨，心中涌起一股说不清的感觉，这些年走过的路和很多已经忘记的事都在这一刻涌上心头。',
      '',
      '他盯着窗外。雨下了很久。',
      '"你还在想她？"老刘问。',
      '他没说话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('paragraph_comma_chain_density_line_3')
    expect(checks[0].label).toBe('段落密度换气扫描')
    expect(checks[0].evidence).toContain('心中涌起一股说不清的感觉')
    expect(checks[0].fix).toContain('换气')
    expect(checks[0].fix).toContain('按动作或信息变化拆开')
  })

  test('wires deterministic comma-chain paragraph density risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphCommaChainDensityChecks = scanParagraphCommaChainDensityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphCommaChainDensityChecks')
  })

  test('detects consecutive still beats that break oh-story motion-still rhythm', () => {
    const checks = scanProseMotionStillRisks([
      '第13章 旧账',
      '',
      '李辰坐在门边，把钥匙擦了一遍，指腹停在缺口上。',
      '',
      '张智低头理平袖口，目光落在名单最后一行。',
      '',
      '走廊重新安静下来，灯影贴着墙根慢慢晃。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('motion_still_consecutive_still')
    expect(checks[0].label).toContain('一动一静')
    expect(checks[0].evidence).toContain('连续全静')
    expect(checks[0].fix).toContain('动后必静')
  })

  test('wires deterministic motion-still rhythm risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseMotionStillChecks = scanProseMotionStillRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseMotionStillChecks')
  })

  test('detects stacked description that splits one action into occurrence perception and reaction', () => {
    const checks = scanProseStackedDescriptionRisks([
      '第13章 签字',
      '',
      '林父低着头，左手把文书压住，右手拿笔，往纸上落。',
      '',
      '手在抖。',
      '',
      '手从肘到腕都在抖，笔尖在纸上停了停，写了一横，又停，那个林字的撇写歪了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_stacked_description')
    expect(checks[0].label).toContain('堆叠式描写')
    expect(checks[0].evidence).toContain('手在抖')
    expect(checks[0].fix).toContain('三维度揉进')
  })

})
