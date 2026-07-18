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
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'),
  ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/quality/review-merge.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/quality/missing-review-checks.ts'), 'utf8'),
  [readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delta-sync-reports.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delta-sync-reports-storyline.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delta-sync-reports-receipts.ts'), 'utf8')].join('\n'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports.ts'), 'utf8'),
  [readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-quality.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-dialogue.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-character.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-asset.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-state.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-structure.ts'), 'utf8')].join('\n'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-core.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8'),
].join('\n')

describe('normalizeSceneCardsPayload quality a a', () => {
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
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneDensityChecks = scanSceneDensityExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneDensityChecks')
  })
  test('wires deterministic scene-card purpose weight risks into quality audit self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicScenePurposeWeightChecks = scanScenePurposeWeightRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicScenePurposeWeightChecks')
    expect(reviewBlock.indexOf('quality_audit_checks')).toBeLessThan(reviewBlock.indexOf('...deterministicScenePurposeWeightChecks'))
  })
  test('wires deterministic scene-card sensory anchor risks into prose craft self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneSensoryChecks = scanSceneSensoryAnchorRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneSensoryChecks')
  })
  test('wires deterministic scene-card serial risk repairs into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneSerialRiskRepairChecks = scanSceneSerialRiskRepairRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneSerialRiskRepairChecks')
    expect(reviewBlock.indexOf('serial_risk_repair_checks')).toBeLessThan(reviewBlock.indexOf('...deterministicSceneSerialRiskRepairChecks'))
  })
  test('wires deterministic scene-card consumption risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
})
