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
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'),
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

describe('normalizeSceneCardsPayload regression b a', () => {
  test('adds a fail check when a required contract review field is missing', () => {
    const checks = appendMissingContractReviewCheck(
      [],
      { version: 'oh_story_dialogue_contract_v1' },
      'dialogue_checks',
      'dialogue_contract',
      '对白质量',
    )

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      key: 'missing_dialogue_checks',
      label: '缺少对白质量自检',
      status: 'fail',
    })
    expect(checks[0].evidence).toContain('chapter_target.dialogue_contract')
    expect(checks[0].fix).toContain('dialogue_checks')
  })

  test('does not add missing-contract fail checks on lightweight structured review paths', () => {
    const checks = appendMissingContractReviewCheck(
      [],
      { version: 'oh_story_dialogue_contract_v1' },
      'dialogue_checks',
      'dialogue_contract',
      '对白质量',
      { emit_missing_check: false },
    )

    expect(checks).toEqual([])
  })

  test('does not add a missing-contract fail check when model checks exist', () => {
    const checks = appendMissingContractReviewCheck(
      [{ key: 'voice', label: '声线差异', status: 'pass' }],
      { version: 'oh_story_dialogue_contract_v1' },
      'dialogue_checks',
      'dialogue_contract',
      '对白质量',
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('voice')
  })

  test('adds a fail check when state tracking contract lacks status filter receipts', () => {
    const checks = appendMissingStatusFilterReceiptCheck(
      [],
      {
        version: 'oh_story_state_tracking_v1',
        character_states: ['李玄：残阵只能维持三息。'],
        historical_causality: ['旧钥匙缺口：第13章待回收。'],
        world_constraints: ['禁门规则：旧钥匙触发会暴露继承权。'],
        source_requirements: ['本章细纲/场景卡', '上一章正文', '追踪/角色状态.md'],
      },
    )

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      key: 'missing_status_filter_receipts',
      label: '缺少状态筛选回执',
      status: 'fail',
    })
    expect(checks[0].evidence).toContain('chapter_target.state_tracking_contract')
    expect(checks[0].fix).toContain('status_filter_receipts')
    expect(checks[0].fix).toContain('used_in_chapter')
    expect(checks[0].fix).toContain('excluded_reason')
  })

  test('reads required review contracts from runtime camelCase chapterTarget', () => {
    const contract = getContextContract(
      {
        chapterTarget: {
          qualityAuditContract: {
            source: 'runtime_chapter_target_quality_contract',
            checks: ['本章一句话概括必须可见'],
          },
        },
      },
      'quality_audit_contract',
    )

    expect(contract?.source).toBe('runtime_chapter_target_quality_contract')
    expect(contract?.checks).toContain('本章一句话概括必须可见')
  })

  test('detects failing structured review checks for normalized review pass state', () => {
    expect(hasFailingReviewChecks({
      dialogue_checks: [
        { key: 'voice', label: '声线差异', status: 'warn' },
      ],
      quality_audit_checks: [
        { key: 'missing_quality_audit_checks', label: '缺少质量诊断自检', status: 'fail' },
      ],
    })).toBe(true)
  })

  test('ignores non-failing structured review checks for normalized review pass state', () => {
    expect(hasFailingReviewChecks({
      dialogue_checks: [
        { key: 'voice', label: '声线差异', status: 'warn' },
      ],
      quality_audit_checks: [
        { key: 'structure', label: '章节结构', status: 'pass' },
      ],
    })).toBe(false)
  })

  test('detects warn or fail structured review checks as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      dialogue_checks: [
        { key: 'voice', label: '声线差异', status: 'warn' },
      ],
    })).toBe(true)
    expect(hasReviewChecksNeedingRepair({
      quality_audit_checks: [
        { key: 'missing_quality_audit_checks', label: '缺少质量诊断自检', status: 'fail' },
      ],
    })).toBe(true)
  })

  test('ignores passing structured review checks as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      dialogue_checks: [
        {
          key: 'voice',
          label: '声线差异',
          status: 'pass',
          speaker: '周远',
          agenda: '用短句压住对手继续逼问',
          subtext: '表面追问账册，实际逼对方承认旧证有效',
          power_shift: '对手从质问转为解释',
          information_delta: '读者知道账册缺页和旧证有关',
          character_voice: '克制、短句、先证据后判断',
          evidence: '周远只问“账册第七页呢”，逼执事停住。',
          fix: '保持短句逼问，不改成解释型长对白。',
          remaining_risk: '',
        },
      ],
      quality_audit_checks: [
        {
          key: 'structure',
          label: '章节结构',
          status: 'pass',
          strategy: 'keep',
          purpose_tag: '冲突推进',
          density_change: '核心对峙展开，过渡压缩',
          conflict_bound_info: '账册缺页信息绑定执事阻拦',
          changed_evidence: '对峙段直接改变双方权力位置。',
          fix: '保持冲突推进段展开，避免增加纯过渡。',
          remaining_risk: '',
        },
      ],
    })).toBe(false)
  })

  test('treats passing pre-draft checks with generic evidence as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      intent_confirmation_checks: [
        {
          key: 'emotion_goal',
          label: '情绪目标',
          status: 'pass',
          delivered: true,
          evidence: '已完成。',
          fix: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      source_readiness_checks: [
        {
          key: 'source_readiness_previous_chapter',
          label: '上一章正文',
          status: 'pass',
          delivered: true,
          evidence: 'ready',
          fix: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      story_state_update_checks: [
        {
          key: 'character_updates_missing',
          label: '角色状态未写回',
          status: 'pass',
          delivered: true,
          source_excerpt: '已经写回。',
          evidence: '已经同步。',
          fix: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      story_state_update_checks: [
        {
          key: 'character_updates_missing',
          label: '角色状态未写回',
          status: 'pass',
          delivered: true,
          source_excerpt: '已经写回。',
          evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
          fix: '',
        },
      ],
    })).toBe(true)
  })

  test('treats passing structured review checks with generic fixes as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      quality_audit_checks: [
        {
          key: 'chapter_progress',
          label: '章节推进',
          status: 'pass',
          strategy: 'rewrite',
          purpose_tag: '冲突推进',
          density_change: '对峙展开，过渡压缩',
          conflict_bound_info: '账册缺页信息绑定执事阻拦',
          changed_evidence: '守军听完旧证后立刻改了城门换防令。',
          fix: '已处理。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)
  })

  test('treats passing structured checks with missing contract fields as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      story_state_update_checks: [
        {
          key: 'character_updates_missing',
          label: '角色状态未写回',
          status: 'pass',
          state_domain: 'character',
          target_file: '追踪/角色状态.md',
          update_path: 'character_updates.周远',
          before_state: '昏迷未醒',
          after_state: '短暂苏醒但行动受限',
          evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
          fix: '补写角色状态。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      foreshadowing_delta_checks: [
        {
          key: 'missing_tracking_entry',
          label: '新增伏笔未登记',
          status: 'pass',
          clue_name: '带血腰牌',
          delta_type: '新增',
          current_status: '已埋下，未回收',
          chapter: '第12章',
          source_excerpt: '主角在禁门下拾起带血腰牌。',
          fix: '补伏笔名、增量类型、当前状态、章节、来源摘录和台账路径。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      chapter_handoff_checks: [
        {
          key: 'previous_handoff',
          label: '上一章最后一幕',
          status: 'pass',
          previous_handoff: '阵盘第二道裂纹逼近主角。',
          opening_obligation: '前300字接住裂纹压力。',
          evidence: '开篇直接写裂纹压住门槛，主角被迫先处理阵盘。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      write_preparation_checks: [
        {
          key: 'previous_chapter_source',
          label: '上一章来源',
          status: 'pass',
          delivered_evidence: '开篇承接上一章阵盘裂纹，并让裂纹压力推进当前目标。',
          fix: '补齐上一章承接来源。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      source_readiness_checks: [
        {
          key: 'previous_chapter',
          label: '上一章正文',
          status: 'pass',
          chapter_evidence: '开篇承接上一章阵盘裂纹，并让裂纹压力推进当前目标。',
          fix: '补齐上一章来源就绪记录。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      intent_confirmation_checks: [
        {
          key: 'emotion_goal',
          label: '情绪目标',
          status: 'pass',
          evidence: '正文用裂纹压力把焦虑推到主角当场选择。',
          fix: '校准情绪目标。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      benchmark_recall_checks: [
        {
          key: 'rhythm_reference',
          label: '节奏召回',
          status: 'pass',
          evidence: '开篇三段内完成压力、判断、行动递进。',
          fix: '校准节奏召回。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      style_sample_checks: [
        {
          key: 'dialogue_ratio',
          label: '对白比例',
          status: 'pass',
          evidence: '对峙段用短句对白推进判断，没有复制样章原句。',
          fix: '校准样章策略。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      reader_retention_checks: [
        {
          key: 'page_turn',
          label: '章末追读',
          status: 'pass',
          evidence: '章末留下第三个名字和下一章追查压力。',
          fix: '校准追读留存。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      target_reader_checks: [
        {
          key: 'reader_desire',
          label: '目标读者欲望',
          status: 'pass',
          evidence: '主角用旧证反压执事，满足被误解后反杀的期待。',
          fix: '校准目标读者。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      genre_positioning_checks: [
        {
          key: 'core_hook',
          label: '题材核心梗',
          status: 'pass',
          evidence: '规则审判场用旧证翻盘，规则约束参与胜负。',
          fix: '校准题材定位。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    const richContractCheckFields = [
      'female_audience_checks',
      'upgrade_rhythm_checks',
      'structure_checks',
      'progression_checks',
      'information_checks',
      'information_flow_checks',
      'expectation_threshold_checks',
      'story_loop_checks',
      'emotional_arc_checks',
      'chapter_hook_checks',
      'paragraph_hook_checks',
      'suspense_checks',
      'conflict_structure_checks',
      'opening_checks',
      'bridge_unit_checks',
      'reversal_checks',
      'showdown_checks',
      'prose_craft_checks',
      'punctuation_tone_checks',
      'content_rubric_checks',
      'quality_audit_checks',
      'core_contract_checks',
      'dialogue_checks',
      'plot_dynamics_checks',
      'continuity_heat_checks',
      'character_relation_checks',
      'character_behavior_checks',
      'asset_linkage_checks',
      'state_tracking_checks',
      'style_boundary_checks',
      'chapter_hook_quality_checks',
      'serial_risk_repair_checks',
      'longform_checks',
      'deslop_repair_checks',
      'innovation_checks',
      'chapter_attraction_checks',
      'story_drive_checks',
      'character_arc_checks',
      'chapter_benchmark_checks',
      'title_uniqueness_checks',
      'prose_meta_checks',
      'banned_words_checks',
      'blueprint_consumption_checks',
      'word_count_checks',
      'revision_receipt_checks',
      'status_filter_receipts',
      'next_chapter_quality_plan_receipts',
    ]
    for (const checkField of richContractCheckFields) {
      expect(hasReviewChecksNeedingRepair({
        [checkField]: [
          {
            key: `${checkField}_self_report`,
            label: '只给了通过状态',
            status: 'pass',
            evidence: '正文看起来已经处理。',
            fix: '模型自称已处理。',
            remaining_risk: '',
          },
        ],
      })).toBe(true)
    }
  })

  test('does not require rich review fields on delivered pre-draft execution receipts', () => {
    expect(hasReviewChecksNeedingRepair({
      write_preparation_checks: [
        {
          key: 'previous_chapter_source',
          label: '上一章来源',
          status: 'pass',
          delivered: true,
          evidence: '开篇承接上一章阵盘裂纹，并让裂纹压力推进当前目标。',
          remaining_risk: '',
        },
      ],
    })).toBe(false)

    expect(hasReviewChecksNeedingRepair({
      source_readiness_checks: [
        {
          key: 'previous_chapter',
          label: '上一章正文',
          status: 'pass',
          delivered: true,
          evidence: '开篇承接上一章阵盘裂纹，并让裂纹压力推进当前目标。',
          remaining_risk: '',
        },
      ],
    })).toBe(false)
  })

})
