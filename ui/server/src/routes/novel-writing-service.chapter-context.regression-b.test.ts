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

describe('chapter context regression b', () => {
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

  test('does not block quality gate on post-repair sync carry-over when prose score and hard issues pass', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 85,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续兑现镇门诱捕。'],
          opening_actions: ['从江哲踏上石板路后的第一步写起。'],
          middle_actions: ['让镇门筛口触发一次真实代价。'],
          ending_actions: ['露出陆长风遗留物的一角。'],
          avoid_repetition: ['不要重复一次天平复核。'],
          evidence_basis: ['本章结尾已经完成镇门邀请和捕兽夹钩子。'],
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            sync_key: 'chapter_blueprint_sync',
            label: '细纲兑现未闭环',
            status: 'fail',
            evidence: '章节蓝图同步：仍有 2 项需要写回追踪。',
            fix: '后续同步章节蓝图和追踪文档。',
            missed_count: 2,
          },
          {
            key: 'quality_audit_repair_receipt_sync',
            label: '质量诊断修复回执未闭环',
            status: 'fail',
            evidence: '质量诊断修复回执残留 3：需要下一轮继续处理。',
            fix: '下一轮优先处理剩余质量诊断回执。',
            missed_count: 3,
          },
          {
            key: 'revision_cascade_impact_evidence',
            label: '修订级联影响证据未闭环',
            status: 'fail',
            evidence: '资产状态需同步到后续章节。',
            fix: '写入状态追踪，不影响本章正文入库。',
          },
        ],
        revision_receipt_checks: [
          {
            key: 'prose_revision_receipt_sync',
            label: '修订回执未闭环',
            status: 'fail',
            evidence: '修订回执残留 5：需要下一章或同步任务继续处理。',
            fix: '下一章继续处理回执残留。',
            missed_count: 5,
          },
        ],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: '去AI味修复回执残留 2：仍有轻度模板风险需下轮继续压。',
            fix: '下一轮继续压去AI味残留。',
            missed_count: 2,
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('结构化自检失败')
  })

  test('does not block quality gate on benchmark recall sync and Gate B carry-over after successful repair', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 86,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章进入镇门内部，减少同类颜色词重复。'],
          opening_actions: ['前300字从镇门门槛和老陈伤势承接。'],
          middle_actions: ['中段让封锁令权限和秩序核心代价继续压迫主角。'],
          ending_actions: ['章末露出陆长风线索的下一层钩子。'],
          avoid_repetition: ['不要重复废墟封锁和天平复核。'],
          evidence_basis: ['本章已经写出镇门邀请、秩序核心耗损和陆长风线索钩子。'],
        },
        benchmark_recall_checks: [
          {
            key: 'benchmark_recall_sync',
            label: '文风召回未闭环',
            status: 'fail',
            evidence: '文风召回同步：本章已按三轮压问推进，剩余节奏差异写入下一章继续处理。',
            fix: '下一章继续把对标节奏转成镇门内部的压迫、爆发、冷却和反应。',
            missed_count: 1,
          },
        ],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate B 句式套路与主语节奏：多人对峙场景仍需保持主语清晰，不能过度省略。',
            fix: '下一章多人对峙仍需继续用物件和动作承接。',
            missed_count: 1,
          },
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate B 句式套路与主语节奏：多人对峙场景仍需清晰点名，未完全消除人名起句。',
            fix: '下一轮继续压去AI味残留，但不重写整章。',
            missed_count: 1,
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('文风召回未闭环')
    expect(decision.reasons.join('｜')).not.toContain('去AI味修复回执未闭环')
  })

  test('does not block quality gate on repaired receipt evidence-location misses and state carry-over', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 85,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续压住镇门内部识别机制和左手代价。'],
          opening_actions: ['前300字从镇门封锁和老陈伤势承接。'],
          middle_actions: ['中段让第二枚秩序核心来源进入可见代价。'],
          ending_actions: ['章末留下诡序之主资产状态的下一层钩子。'],
          avoid_repetition: ['不要重复雾、复眼、符文同组意象。'],
          evidence_basis: ['本章已经写出镇门邀请、秩序核心耗损和规则反制。'],
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            sync_key: 'chapter_blueprint_sync',
            label: '细纲兑现未闭环',
            status: 'fail',
            evidence: '章节蓝图同步：当前正文部分目标未充分落地，但第二枚秩序核心来源需后续同步写回。',
            fix: '下一章继续解释镇门内部识别机制，但不能一次性讲完。',
            missed_count: 1,
          },
          {
            key: 'pre_store_structural_sync',
            sync_key: 'benchmark_recall_sync',
            label: '文风召回未闭环',
            status: 'fail',
            evidence: '文风召回同步：当前正文部分节奏未充分落地；剩余节奏差异进入下一章继续处理。',
            fix: '后续继续压住压迫、爆发、冷却和反应。',
            missed_count: 1,
          },
          {
            key: 'quality_audit_repair_receipt_sync',
            label: '质量诊断修复回执未闭环',
            status: 'fail',
            evidence: 'changed_evidence 无法定位到修订后正文。',
            fix: '后续需延续左手代价。',
            remaining_risk: '镇门内部识别机制需下一章继续解释但不能一次性讲完。',
          },
          {
            key: 'revision_cascade_impact_evidence',
            label: '修订级联影响证据未闭环',
            status: 'fail',
            evidence: '第二枚秩序核心、暗金信件、江哲左掌代价需同步到后续追踪。',
            fix: '写入状态追踪，不影响本章正文入库。',
            remaining_risk: '资产状态写回义务。',
          },
        ],
        revision_receipt_checks: [
          {
            key: 'prose_revision_receipt_sync',
            label: '修订回执未闭环',
            status: 'fail',
            evidence: 'changed_evidence 无法定位到修订后正文。',
            fix: '诡序之主本体仍未直接出场，符合当前认知边界；下一章需从镇门前继续。',
            remaining_risk: '下一章继续承接敌方视觉体系。',
          },
        ],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate A changed_evidence 无法定位到修订后正文。',
            fix: '旧回执证据片段已被修订改写，后续继续避免模板表达。',
            remaining_risk: 'changed_evidence 无法定位到修订后正文。',
          },
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate G changed_evidence 无法定位到修订后正文。',
            fix: '旧回执证据片段已被修订改写，下一章继续避免章末总结体。',
            remaining_risk: 'changed_evidence 无法定位到修订后正文。',
          },
        ],
        delivery_risk_receipts: [
          {
            risk_item: '补资产状态：诡序之主',
            required_action: '补资产状态：诡序之主。',
            delivered: false,
            evidence: '诡序之主本体仍未直接出场，符合当前认知边界。',
            remaining_risk: '承接回执缺失：补资产状态：诡序之主。',
          },
          {
            risk_item: '补角色状态：江哲',
            required_action: '补角色状态：江哲左掌代价。',
            delivered: false,
            evidence: '江哲左掌代价已经进入下一章质量续航计划。',
            remaining_risk: '承接回执缺失：补角色状态：角色状态增量缺口 2｜修复：江哲：主角。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('结构化自检失败')
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('does not block quality gate on benchmark recall sync wording and quality-continuation delivery receipts', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 86,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章直接验证镇门内陆长风声音真假。'],
          opening_actions: ['前300字承接镇门声音和江哲即时选择。'],
          middle_actions: ['中段让镇门夹缝触发一次规则反制。'],
          ending_actions: ['章末留下陆长风真实状态碎片。'],
          avoid_repetition: ['不要重复封锁令宣读。'],
          evidence_basis: ['本章已经留下镇门内声音和核心裂痕代价。'],
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            sync_key: 'benchmark_recall_sync',
            label: '文风召回未闭环',
            status: 'fail',
            evidence: '召回缺口 1：正文有 1 项文风召回要求未充分落地。',
            fix: '下一次修订优先补足文风召回 missed 项；保留 gaps 中的缺口，不要把缺失的深度拆解、冲突来源或文风偏差误判为已经解决。',
            missed_count: 1,
          },
        ],
        delivery_risk_receipts: [
          {
            risk_item: '补追读：漏追读 7',
            required_action: '把反派长期目标转入下一章追读计划。',
            delivered: false,
            evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
            remaining_risk: '承接回执缺失：补追读：漏追读 7｜修复：诡序之主：通过不断降临怪谈副本，彻底蚕食蓝星人类的理智，将蓝星转化为怪谈世界的一部分，实现真身降临。',
          },
          {
            risk_item: '修吸引力：吸引力缺口 4',
            required_action: '把核心卖点转入下一章质量续航。',
            delivered: false,
            evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
            remaining_risk: '承接回执缺失：修吸引力：吸引力缺口 4｜修复：江哲：破解怪谈世界：我是超人，怪谈你随意的核心规则。',
          },
          {
            risk_item: '补循环：故事循环缺口 2',
            required_action: '把资产状态写回下一轮状态更新。',
            delivered: false,
            evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
            remaining_risk: '承接回执缺失：补循环：故事循环缺口 2｜修复：不要重写全设定表；只处理本章计划触达且正文实际改变的关键资产。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('文风召回未闭环')
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('blocks quality gate when deslop diagnostic gates fail even if the score passes', () => {
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
        deslop_gate_diagnostics: {
          gates: [
            {
              gate: 'A',
              label: '禁用词/模板表达',
              status: 'fail',
              evidence: '那不是普通水迹，而是一种更深的规则。',
              fix: '直接写水迹倒流。',
            },
          ],
        },
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('禁用词/模板表达')
  })

  test('blocks quality gate when delivery risk receipts remain undelivered even if the score passes', () => {
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
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续把门槛白线写成规则边界。'],
          opening_actions: ['前300字用门槛白线承接玻璃门对峙。'],
          middle_actions: ['中段让白线规则反制一次硬闯。'],
          ending_actions: ['章末用白线另一侧的新脚印形成追读。'],
          avoid_repetition: ['不要再用旁白总结“危机才刚开始”。'],
          evidence_basis: ['本章已把门槛白线写成新的规则边界。'],
        },
        delivery_risk_receipts: [
          {
            risk_item: 'IP场面延展：待延展 1',
            required_action: '延展玻璃门内外对峙的门槛白线强画面。',
            delivered: false,
            evidence: '',
            remaining_risk: '正文没有延展玻璃门内外对峙。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('承接回执未兑现')
    expect(decision.reasons.join('｜')).toContain('IP场面延展')
  })

  test('does not block quality gate when delivery risk receipts are delivered with no remaining risk', () => {
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
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续把门槛白线写成规则边界。'],
          opening_actions: ['前300字用门槛白线承接玻璃门对峙。'],
          middle_actions: ['中段让白线规则反制一次硬闯。'],
          ending_actions: ['章末用白线另一侧的新脚印形成追读。'],
          avoid_repetition: ['不要再用旁白总结“危机才刚开始”。'],
          evidence_basis: ['本章已把门槛白线写成新的规则边界。'],
        },
        delivery_risk_receipts: [
          {
            risk_item: 'IP场面延展：待延展 1',
            required_action: '延展玻璃门内外对峙的门槛白线强画面。',
            delivered: true,
            evidence: '门槛白线后退半步，玻璃门内外对峙被写成新的规则边界。',
            remaining_risk: '无',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('does not block quality gate for delivery risk receipts that only need post-delivery sync or next-chapter carry-over', () => {
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
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续压住镇门危局。'],
          opening_actions: ['前300字原地承接镇门倒计时。'],
          middle_actions: ['中段用资产代价换一次规则反制。'],
          ending_actions: ['章末留下镇门新权限钩子。'],
          avoid_repetition: ['不要重复解释镇门来历。'],
          evidence_basis: ['本章已经写出镇门封锁和资产消耗。'],
        },
        delivery_risk_receipts: [
          {
            risk_item: '资产挂钩',
            required_action: '让关键资产参与胜负。',
            delivered: false,
            evidence: '秩序残核白光与照胆鼎残影共同压住完美超人基因。',
            remaining_risk: '资产台账需同步。',
          },
          {
            risk_item: '伏笔追踪',
            required_action: '把新门名写入追踪。',
            delivered: false,
            evidence: '入门者，留名。',
            remaining_risk: '需更新追踪/伏笔.md。',
          },
          {
            risk_item: '回报密度',
            required_action: '保持阶段性物理爽点。',
            delivered: false,
            evidence: '复核前不得强夺随身物。',
            remaining_risk: '下一章需补更强物理爽点或规则反制。',
          },
          {
            risk_item: '状态跟踪',
            required_action: '中段跟踪江哲、老陈、敌方封锁状态。',
            delivered: false,
            evidence: '江哲黑符收紧且临时通行；老陈污染爬向喉咙；追索者被令牌约束但履带车跟随。',
            remaining_risk: 'delivery_risk_receipts middle_actions 的 evidence 未落在中段事件推进。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('persists a warning prose quality review when valid prose is admitted with advisory quality failures', async () => {
    const failedReview = (evidence: string) => ({
      score: 61,
      publishable: false,
      dimensions: { ...proseQualityScores, prose_style: 4 },
      findings: [{
        key: 'prose_style',
        severity: 'S2',
        dimension: 'prose_style',
        evidence,
        required_change: '减少模板化表达并保留具体动作',
        acceptance_test: '正文以动作和对白推进，不使用抽象总结',
      }],
    })
    const revisedText = buildPipelineProse(
      '江澈撞断路灯，追兵的包围线被飞石逼开。',
      '沿自己制造的缺口夺下通讯器并继续推进',
    )
    const harness = await createProsePipelineHarness({
      reviewPayloads: [
        failedReview('倒数压到最后三秒，江澈停在围墙阴影里等待。'),
        failedReview('江澈撞断路灯，追兵的包围线被飞石逼开。'),
      ],
      revisionTexts: [revisedText],
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      quality_threshold: 78,
    })
    const proseQualityReview = (await listNovelReviews(harness.workspace, harness.project.id))
      .filter(review => review.review_type === 'prose_quality')
      .at(-1)
    const payload = JSON.parse(String(proseQualityReview?.payload || '{}'))

    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'quality' }))
    expect(proseQualityReview?.status).toBe('warn')
    expect(payload.self_check?.review).toMatchObject({
      passed: false,
      score: 61,
      needs_revision: true,
    })
    expect(payload.self_check?.review?.issues?.length).toBeGreaterThan(0)
  })

  test('reports review stage status from quality gate decisions', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8')].join('\n')
    const reviewStart = source.indexOf("await onStage('review', { status: 'running' })")
    const qualityGateStart = source.indexOf('let qualityGateReview = buildQualityGateReviewWithDeterministicCleanup')
    const reviewBlock = source.slice(reviewStart, qualityGateStart)

    expect(reviewBlock).toContain('const initialReviewDecision = getQualityGateDecision(qualityGateProject')
    expect(reviewBlock).toContain("status: initialReviewDecision.passed ? 'success' : 'warn'")
    expect(reviewBlock).toContain("phase: round > 0 ? 'quality_recheck' : 'quality_review'")
    expect(reviewBlock).toContain("await onStage('revise', { status: 'running', phase: 'quality_revision', round })")
    expect(reviewBlock).toContain('maxRevisionRounds: isDraftReviewOnly || isDraftOnly ? 0 : 1')
    expect(reviewBlock).toContain('qualityWarningCandidates.push(')
    expect(reviewBlock).not.toContain('assertProseQualityCanStore')
  })

  test('formats structured review findings for stored issue summaries', () => {
    const summary = formatReviewIssueForStorage({
      severity: 'S2',
      category: 'prose',
      location: '第3段',
      evidence: '眼神复杂',
      issue: '抽象心理和AI高频套话',
      fix: '改成具体动作和对白反应',
    })

    expect(summary).toContain('S2')
    expect(summary).toContain('prose')
    expect(summary).toContain('第3段')
    expect(summary).toContain('抽象心理和AI高频套话')
    expect(summary).toContain('证据：眼神复杂')
    expect(summary).toContain('修法：改成具体动作和对白反应')
  })

  test('formats scene-card receipt findings with scene and field metadata for repair tasks', () => {
    const summary = formatReviewIssueForStorage({
      key: 'scene_card_receipt_2_undelivered',
      label: '场景卡回执证据复核',
      status: 'fail',
      scene_no: 2,
      fields: ['目标/阻碍/状态变化', '感知锚点'],
      evidence: '场景2《盟友改口》scene_card_receipts 标记未兑现。',
      fix: '按 delivered=false 的字段修正文，再重写 scene_card_receipts。',
    })

    expect(summary).toContain('fail')
    expect(summary).toContain('场景卡回执证据复核')
    expect(summary).toContain('场景2')
    expect(summary).toContain('目标/阻碍/状态变化、感知锚点')
    expect(summary).toContain('scene_card_receipt_2_undelivered')
    expect(summary).not.toContain('[object Object]')
  })

  test('exposes pre-draft brief routes for build, save, and confirm', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-chapter-context-routes.ts'), 'utf8')

    expect(source).toContain("app.get('/api/novel/chapters/:chapterId/pre-draft-brief'")
    expect(source).toContain("app.put('/api/novel/chapters/:chapterId/pre-draft-brief'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/pre-draft-brief/confirm'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/pre-draft-brief/style-samples'")
    expect(source).toContain('applyStyleSampleStrategyAuthorAction')
    expect(source).toContain('raw_payload.pre_draft_brief')
  })

})
