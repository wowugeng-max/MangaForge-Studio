import '../novel-writing-service/quality/review-merge.unit.test'
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

function proseQualityRisksSource() {
  const dir = join(import.meta.dir, '../novel-writing-service/quality')
  return [
    'prose-quality-risks.ts',
    'prose-quality-risks-extended.ts',
    'prose-quality-risks-extended-core.ts',
    'prose-quality-risks-extended-handoff.ts',
    'prose-quality-risks-extended-audience.ts',
    'prose-quality-risks-audience.ts',
    'prose-quality-risks-audience-core.ts',
    'prose-quality-risks-audience-hooks.ts',
    'prose-quality-risks-audience-craft.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('chapter context regression b a', () => {
  test('keeps prose revision receipts for post-revision quality audit', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const revisionParseBlock = source.slice(
      source.indexOf('const revisionPayload = getNovelPayload(revisionResult)'),
      source.indexOf('const runCommercialEditorRewrite', source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')),
    )

    expect(revisionPrompt).toContain('字数对比')
    expect(revisionPrompt).toContain('30%')
    expect(revisionPrompt).toContain('800 字')
    expect(revisionPrompt).toContain('revision_scope_guard')
    expect(revisionParseBlock).toContain('revisionPayload?.proseChapters')
    expect(revisionParseBlock).toContain('revisedFirst?.chapterText')
    expect(revisionParseBlock).toContain('revisionPayload?.chapterText')
    expect(revisionParseBlock).toContain('revisedFirst?.sceneBreakdown')
    expect(revisionParseBlock).toContain('revisionPayload?.sceneBreakdown')
    expect(revisionParseBlock).toContain('revisedFirst?.continuityNotes')
    expect(revisionParseBlock).toContain('revisionPayload?.continuityNotes')
    expect(revisionParseBlock).toContain('revision_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.revision_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.revisionReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.revision_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.revisionReceipts')
    expect(revisionParseBlock).toContain('deslop_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.deslop_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.deslopRepairReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.deslop_repair_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.deslopRepairReceipts')
    expect(revisionParseBlock).toContain('quality_audit_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.quality_audit_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.qualityAuditRepairReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.quality_audit_repair_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.qualityAuditRepairReceipts')
    expect(revisionParseBlock).toContain('revision_scope_guard')
  })

  test('keeps nested oh-story revision receipts for post-revision quality audit', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionStart = source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')
    const revisionParseBlock = source.slice(
      revisionStart,
      source.indexOf('oh_story_delivery_receipts: revisionDeliveryReceipts', revisionStart) + 'oh_story_delivery_receipts: revisionDeliveryReceipts'.length + 80,
    )

    expect(revisionParseBlock).toContain('revisedFirst?.oh_story_delivery_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.ohStoryDeliveryReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.oh_story_delivery_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.ohStoryDeliveryReceipts')
    expect(revisionParseBlock).toContain('oh_story_delivery_receipts: revisionDeliveryReceipts')
  })

  test('normalizes oh-story findings without dropping evidence or fix fields', () => {
    const issue = normalizeIssue({
      severity: 'S2',
      category: 'prose',
      location: '第3段',
      evidence: '眼神复杂',
      issue: '抽象心理和AI高频套话',
      fix: '改成具体动作和对白反应',
    })

    expect(issue.severity).toBe('S2')
    expect(issue.type).toBe('prose')
    expect(issue.category).toBe('prose')
    expect(issue.location).toBe('第3段')
    expect(issue.evidence).toBe('眼神复杂')
    expect(issue.description).toBe('抽象心理和AI高频套话')
    expect(issue.fix).toBe('改成具体动作和对白反应')
    expect(issue.suggestion).toBe('改成具体动作和对白反应')
  })

  test('normalizes camelCase review control fields from model output', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewNormalizeStart = source.indexOf('const rawReviewIssues = [')
    const reviewNormalizeBlock = source.slice(
      reviewNormalizeStart,
      source.indexOf('if (options.revise === false || !shouldReviseProse', reviewNormalizeStart),
    )

    expect(reviewNormalizeStart).toBeGreaterThan(-1)
    expect(reviewNormalizeBlock).toContain('reviewPayload?.needsRevision')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.revisionDirectives')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.focusedRevisionModes')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.settingViolations')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.craftMetrics')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.findings')
    expect(reviewNormalizeBlock).toContain('...asArray(reviewPayload?.issues)')
    expect(reviewNormalizeBlock).toContain('...asArray(reviewPayload?.findings)')
  })

  const buildUsableV2NextChapterQualityPlan = () => ({
    version: 'oh_story_next_chapter_quality_plan_v1',
    quality_focus: ['下一章继续压住当前冲突。'],
    opening_actions: ['前300字原地承接本章章末动作。'],
    middle_actions: ['中段兑现一次规则反制。'],
    ending_actions: ['章末留下可追读的新问题。'],
    avoid_repetition: ['不要重复解释本章规则。'],
    evidence_basis: ['本章已经写出当前冲突的可定位证据。'],
  })

  test('v2 final decision blocks a structured quality failure even when the v2 score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            status: 'fail',
            label: '细纲兑现未闭环',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'structured_quality_gate', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision blocks a structured carry-over claim that only provides a fix', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            status: 'fail',
            label: '细纲兑现未闭环',
            fix: '下一章写入追踪文档。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'structured_quality_gate', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision allows a structured carry-over with locatable prose evidence', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            status: 'fail',
            label: '细纲兑现未闭环',
            evidence: '门槛白线后退半步，当前冲突已经在正文中落地。',
            fix: '下一章写入追踪文档。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.approvable).toBe(true)
    expect(decision.hard_failures).toEqual([])
  })

  test('v2 final decision blocks an undelivered current-chapter delivery risk', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        delivery_risk_receipts: [
          {
            risk_item: '当前冲突兑现',
            delivered: false,
            evidence: '',
            remaining_risk: '正文未兑现当前冲突。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'delivery_risk_receipt', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision allows a locatable delivery receipt with only next-chapter carry-over', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        delivery_risk_receipts: [
          {
            risk_item: '下一章冲突强化',
            delivered: false,
            evidence: '门槛白线后退半步，玻璃门内外的当前冲突已经落成正文。',
            remaining_risk: '下一章继续强化冲突并写回状态。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.approvable).toBe(true)
    expect(decision.hard_failures).toEqual([])
  })

  test('v2 final decision blocks a missing next-chapter quality plan', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'next_chapter_quality_plan', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision is not approvable when an original v2 hard failure remains', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: false,
            approvable: true,
            score: 92,
            hard_failures: [
              {
                key: 'non_chinese_leak',
                message: '正文出现连续英文段落',
                source: 'deterministic',
              },
            ],
            advisory_failures: [],
          },
        },
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toHaveLength(1)
  })

  test('v2 final decision preserves and deduplicates v2 hard failures while adding safety', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: false,
            approvable: true,
            score: 92,
            hard_failures: [
              {
                key: 'non_chinese_leak',
                message: '正文出现连续英文段落',
                source: 'deterministic',
                evidence: 'Chapter summary leaked into the prose.',
                severity: 'S1',
              },
              { key: 'non_chinese_leak', message: '正文出现连续英文段落', source: 'deterministic' },
            ],
            advisory_failures: ['节奏仍可继续收紧'],
          },
        },
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
      {
        blocked: true,
        reasons: ['命中禁止仿写表达'],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures.filter((item: any) => item.key === 'non_chinese_leak')).toHaveLength(1)
    expect(decision.hard_failures.find((item: any) => item.key === 'non_chinese_leak')).toMatchObject({
      evidence: 'Chapter summary leaked into the prose.',
      severity: 'S1',
    })
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'reference_safety', source: 'deterministic' }),
    ]))
    expect(decision.reasons).toEqual(expect.arrayContaining([
      '正文出现连续英文段落',
      '仿写安全未通过：命中禁止仿写表达',
      '节奏仍可继续收紧',
    ]))
  })

  test('blocks quality gate when oh-story contract checks fail even if the score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        score: 88,
        issues: [],
        quality_audit_checks: [
          {
            key: 'missing_quality_audit_checks',
            label: '缺少质量诊断自检',
            status: 'fail',
            evidence: 'chapter_target.quality_audit_contract 存在，但模型没有输出 quality_audit_checks。',
            fix: '补充 quality_audit_checks。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('质量诊断自检')
  })

  test('summarizes anonymous structured gate failures without leaking prose excerpts', () => {
    const proseExcerpt = '江哲却注意到，老陈说出“诡序天平”四个字时，所有追索者的枪口同时向下沉了半寸。不是害怕，是训练出来的避让。'
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 88,
        issues: [],
        next_chapter_quality_plan: {
          quality_focus: ['继续压住公开诱捕压力。'],
          opening_actions: ['用镇门封锁承接。'],
          middle_actions: ['让规则复核升级。'],
          ending_actions: ['章末留下镇门诱捕。'],
          avoid_repetition: ['不重复解释天平规则。'],
          evidence_basis: ['本章已经写出诡序天平反制。'],
        },
        quality_audit_checks: [
          {
            status: 'fail',
            evidence: proseExcerpt,
            fix: '补成可复核的质量诊断回执。',
          },
        ],
      },
    )

    const reasonText = decision.reasons.join('｜')
    expect(decision.passed).toBe(false)
    expect(reasonText).toContain('质量诊断')
    expect(reasonText).not.toContain('江哲却注意到')
  })

  test('blocks quality gate when prose revision receipts are missing after revision', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        revision_receipt_checks: [
          {
            key: 'missing_revision_receipts',
            label: '修订回执未生成',
            status: 'fail',
            evidence: '自检要求修复承接风险，但修订结果没有逐条 revision_receipts。',
            fix: '重新修订并逐条输出 revision_receipts.changed_evidence。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('修订回执未生成')
  })

  test('blocks quality gate when deslop repair receipts still have residual risks', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate F 章末总结体仍残留。',
            fix: '重新修订并给出 deslop_repair_receipts.changed_evidence。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('去AI味修复回执未闭环')
  })

})
