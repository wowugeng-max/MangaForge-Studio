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
  [readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delta-sync-reports.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delta-sync-reports-storyline.ts'), 'utf8')].join('\n'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-core.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8'),
].join('\n')

describe('normalizeSceneCardsPayload regression b', () => {
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

  test('wires missing contract review checks into normalized self review', () => {
    const source = readWritingServicePackageSource()
    const reviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewBlock).toContain('requiredContractChecks')
    expect(reviewBlock).toContain('dialogue_contract')
    expect(reviewBlock).toContain('quality_audit_contract')
    expect(source).toContain('appendMissingContractReviewCheck')
  })

  test('marks normalized self review score as defaulted only when model omits score', () => {
    const source = readWritingServicePackageSource()
    const scoreStart = source.indexOf('const rawReviewScore = Number(reviewPayload?.score)')
    const reviewBlock = source.slice(
      scoreStart,
      source.indexOf('if (options.revise === false', scoreStart),
    )

    expect(scoreStart).toBeGreaterThan(0)
    expect(reviewBlock).toContain('const rawReviewScore = Number(reviewPayload?.score)')
    expect(reviewBlock).toContain('const reviewScoreDefaulted = !Number.isFinite(rawReviewScore)')
    expect(reviewBlock).toContain('const deterministicWordCountIssueGuard = applyDeterministicWordCountIssueGuard')
    expect(reviewBlock).toContain('score: reviewScoreDefaulted ? 80 : deterministicWordCountIssueGuard.score')
    expect(reviewBlock).toContain('score_defaulted: reviewScoreDefaulted')
  })

  test('asks prose self review and revision to cover dialogue execution checklist', () => {
    const source = readWritingServicePackageSource()
    expect(source).toContain('dialogue_execution_checklist')
    expect(source).toContain('必须按对话执行清单逐场覆盖 dialogue_checks')
    expect(source).toContain('dialogue_checks.changed_evidence')
  })

  test('aligns normalized review passed flag with failing structured checks', () => {
    const source = readWritingServicePackageSource()
    const reviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewBlock).toContain('normalizedReview.passed = normalizedReview.passed && !hasFailingReviewChecks(normalizedReview)')
  })

  test('aligns normalized review needs_revision flag with repair-worthy structured checks', () => {
    const source = readWritingServicePackageSource()
    const reviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewBlock).toContain('normalizedReview.needs_revision = normalizedReview.needs_revision || hasReviewChecksNeedingRepair(normalizedReview)')
  })

  test('does not synthesize missing structured contract failures when structured fill is disabled', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('const structuredFillReview = await fillMissingStructuredReviewChecks', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const emitMissingStructuredContractChecks = options.fill_missing_structured_checks !== false')
    expect(reviewBlock).toContain('emit_missing_check: emitMissingStructuredContractChecks')
  })

  test('wires foreshadowing delta checks into normalized self review', () => {
    const source = readWritingServicePackageSource()
    const reviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewBlock).toContain("foreshadowing_delta_checks: reviewChecks('foreshadowing_delta_checks', 'foreshadowingDeltaChecks')")
  })

  test('detects duplicate chapter titles after removing chapter number prefixes', () => {
    const report = buildChapterTitleUniquenessReport([
      { id: 1, chapter_no: 1, title: '第1章 门外学生' },
      { id: 2, chapter_no: 2, title: '守则初读' },
      { id: 3, chapter_no: 3, title: '门外学生' },
    ], { id: 3, chapter_no: 3, title: '门外学生' })

    expect(report.status).toBe('warn')
    expect(report.duplicates).toHaveLength(1)
    expect(report.duplicates[0].chapter_no).toBe(1)
    expect(report.normalized_title).toBe('门外学生')
    expect(report.fix).toContain('本章核心事件')
  })

  test('builds post-delivery chapter title uniqueness sync report', () => {
    const okReport = buildChapterTitleUniquenessSyncReport([
      { id: 1, chapter_no: 1, title: '第1章 门外学生' },
      { id: 2, chapter_no: 2, title: '第2章 校徽敲门' },
    ], { id: 2, chapter_no: 2, title: '第2章 校徽敲门' })
    const warnReport = buildChapterTitleUniquenessSyncReport([
      { id: 1, chapter_no: 1, title: '第1章 门外学生' },
      { id: 2, chapter_no: 2, title: '守则初读' },
      { id: 3, chapter_no: 3, title: '门外学生' },
    ], { id: 3, chapter_no: 3, title: '门外学生' })

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('章节标题去重 OK')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('章节标题重复')
    expect(warnReport.missed_count).toBe(1)
    expect(warnReport.duplicates[0].chapter_no).toBe(1)
    expect(warnReport.missed[0].title).toBe('第1章 门外学生')
    expect(warnReport.next_actions.join('；')).toContain('核心事件、冲突转折、关键资产或章尾钩子改名')
  })

  test('story state sync persists a chapter_title_uniqueness_sync review', () => {
    const source = readWritingServicePackageSource()

    expect(source).toContain("reviewType: 'chapter_title_uniqueness_sync'")
    expect(source).toContain('buildChapterTitleUniquenessSyncReport(chapters, chapter)')
    expect(source).toContain('payload.chapter_title_uniqueness_sync = chapterTitleUniquenessSync')
  })

  test('wires title uniqueness report into chapter context preflight', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    expect(source).toContain('buildChapterTitleUniquenessReport(sorted, chapter)')
    expect(source).toContain('chapter_title_unique')
    expect(source).toContain('title_uniqueness_report')
  })

  test('adds duplicate title repair instructions to the prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '门外学生敲门，主角必须判断救或不救。',
          conflict: '开门会违反规则，不开门会失去线索。',
          ending_hook: '学生袖口露出上一轮玩家的校徽。',
          scene_cards: [{ title: '玻璃门前', conflict: '是否开门', reader_payoff: '规则边界再次压迫主角' }],
          title_uniqueness_report: {
            status: 'warn',
            normalized_title: '门外学生',
            duplicates: [{ id: 1, chapter_no: 1, title: '第1章 门外学生' }],
            fix: '标题与既有章节重复，需按本章核心事件、冲突转折、关键资产或章尾钩子改名，并同步章节标题。',
          },
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【章节标题去重】')
    expect(prompt).toContain('oh-story Step 2.1 标题预检')
    expect(prompt).toContain('第1章《第1章 门外学生》')
    expect(prompt).toContain('输出 JSON 的 title 必须改成不重复的新标题')
    expect(prompt).toContain('本章核心事件、冲突转折、关键资产或章尾钩子')
    expect(prompt).toContain('同步细纲标题与正文文件名')
  })

  test('adds default prose meta hygiene rules to the paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧楼门牌',
          summary: '主角接住门牌翻面的现场余波。',
          conflict: '她必须把旧印来源变成现场证据。',
          ending_hook: '火漆背面露出第二枚编号。',
          scene_cards: [{ title: '门牌翻面', conflict: '是否公开旧印来源' }],
        },
      },
      null,
      { chapter_no: 8, title: '旧楼门牌' },
    )

    expect(prompt).toContain('正文元信息清洁')
    expect(prompt).toContain('标题行以外不得出现')
    expect(prompt).toContain('上一章/本章/前文/后文/伏笔/细纲/读者/第X章')
    expect(prompt).toContain('角色当下能感知的事件锚点或相对时间')
  })

  test('adds oh-story format-and-structure guardrails to prose generation, review, and revision prompts', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧楼门牌',
          summary: '主角接住门牌翻面的现场余波。',
          conflict: '她必须把旧印来源变成现场证据。',
          ending_hook: '火漆背面露出第二枚编号。',
          scene_cards: [{ title: '门牌翻面', conflict: '是否公开旧印来源' }],
        },
      },
      null,
      { chapter_no: 8, title: '旧楼门牌' },
    )

    expect(prompt).toContain('正文格式与小节结构')
    expect(prompt).toContain('全文统一章节标记：###1. / ###第一章 / 1.')
    expect(prompt).toContain('段间保留一个空行')
    expect(prompt).toContain('不得出现两个以上连续空行')
    expect(prompt).toContain('无缩进')
    expect(prompt).toContain('正文段落中不使用 Markdown')
    expect(prompt).toContain('对话独立成行')
    expect(prompt).toContain('引号风格按项目/平台约定')
    expect(prompt).toContain('quote-mode keep')
    expect(prompt).toContain('「」')
    expect(prompt).toContain('一个主事件 + 3-5 个子事件')

    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('const shouldReviseProse ='),
    )

    expect(reviewPromptBlock).toContain('是否违反 oh-story 正文格式与小节结构')
    expect(reviewPromptBlock).toContain('章节标记必须统一为 ###1. / ###第一章 / 1. 或项目指定格式')
    expect(reviewPromptBlock).toContain('段间保留一个空行')
    expect(reviewPromptBlock).toContain('quote-mode keep')
    expect(revisionPromptBlock).toContain('如果自检结果包含正文格式扫描、章节标记格式扫描或 deterministicProseFormatChecks')
    expect(revisionPromptBlock).toContain('合并多余空行、删除缩进和正文 Markdown')
    expect(revisionPromptBlock).toContain('保留项目/平台指定的合法引号风格')
  })

  test('adds web-novel paragraph rhythm guardrails to prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧楼门牌',
          summary: '主角接住门牌翻面的现场余波。',
          conflict: '她必须把旧印来源变成现场证据。',
          ending_hook: '火漆背面露出第二枚编号。',
          scene_cards: [{ title: '门牌翻面', conflict: '是否公开旧印来源' }],
        },
      },
      null,
      { chapter_no: 8, title: '旧楼门牌' },
    )

    expect(prompt).toContain('段间保留一个空行')
    expect(prompt).toContain('断段按戏剧单元/镜头自然断开')
    expect(prompt).not.toContain('不得出现空行或连续换行')
  })

  test('adds previous chapter ending excerpt to the paragraph prose prompt for serial handoff continuity', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const previousEnding = '旧楼门牌在雨水里翻成黑面，林青禾听见门内第三次敲击。李玄按住她的手腕，没有让她开门，只说等钟声停。'
    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        continuity: {
          previous_chapter: {
            chapter_no: 7,
            title: '黑面门牌',
            ending_hook: '钟声停下前不能开门。',
            ending_excerpt: previousEnding,
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '停钟以后',
          summary: '李玄必须在钟声停后处理门后的人。',
          conflict: '开门会触发旧楼规则，不开门会丢失证人。',
          ending_hook: '证人袖口露出旧印编号。',
          scene_cards: [{ title: '停钟门前', conflict: '是否开门', purpose: '承接上一章黑面门牌余波' }],
        },
      },
      null,
      { chapter_no: 8, title: '停钟以后' },
    )

    expect(prompt).toContain('【上一章尾段原文承接】')
    expect(prompt).toContain('第7章《黑面门牌》')
    expect(prompt).toContain(previousEnding)
    expect(prompt).toContain('前300字必须接住上一章最后一幕')
    expect(prompt).toContain('不能只复述摘要或改写成新的开场')
  })

  test('preserves true final previous chapter handoff when ending excerpt is long', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const earlyResolvedAction = '规则三已经完成：关门键失效，江哲用身体挡住电梯门，倒计时结束，电梯危机暂时解除。'.repeat(8)
    const trueFinalMoment = '最后，规则五索要右臂，巨大鬼手卡在门框上，江哲看见血字下方的金色符文，意识到规则曾被篡改，随即踏入红雾。'
    const prompt = service.buildParagraphProseContext(
      { title: '怪谈世界：我是超人，怪谈你随意' },
      {
        continuity: {
          previous_chapter: {
            chapter_no: 1,
            title: '异常入局',
            ending_hook: '规则背后还有更高层力量在博弈。',
            ending_excerpt: `${earlyResolvedAction}${trueFinalMoment}`,
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '旧法失准',
          summary: '江哲进入红雾后发现旧办法不再可靠。',
          conflict: '暴力硬抗会导致规则牢笼崩坏。',
          ending_hook: '旧答案指向更危险的证据。',
          scene_cards: [{ title: '红雾深处', conflict: '是否继续用蛮力破局', purpose: '承接规则五与金色符文的未解问题' }],
        },
      },
      null,
      { chapter_no: 2, title: '旧法失准' },
    )

    const handoffStart = prompt.indexOf('【上一章尾段原文承接】')
    const handoffEnd = prompt.indexOf('【写前准备卡】', handoffStart)
    const handoffBlock = prompt.slice(handoffStart, handoffEnd === -1 ? handoffStart + 900 : handoffEnd)

    expect(handoffBlock).toContain('【上一章尾段原文承接】')
    expect(handoffBlock).toContain('第1章《异常入局》')
    expect(handoffBlock).toContain('规则五')
    expect(handoffBlock).toContain('金色符文')
    expect(handoffBlock).toContain('踏入红雾')
  })

  test('asks paragraph prose prompt to execute oh-story scene-card directive fields', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        chapter_target: {
          chapter_no: 9,
          title: '蓝晶灼手',
          summary: '蓝晶首次出现并改变证据判断。',
          conflict: '主角必须用蓝晶抢回证据记忆。',
          ending_hook: '蓝晶烧出第二段陌生记忆。',
          scene_cards: [
            {
              title: '蓝晶灼手',
              purpose: '蓝晶首次进入正文并改变证据判断',
              concept_anchor_rules: ['蓝晶首次出现必须先写灼手反应和物理后果。'],
              prose_craft_directives: ['不得用整段来历/等级解释蓝晶。'],
            },
          ],
        },
      },
      null,
      { chapter_no: 9, title: '蓝晶灼手' },
    )

    expect(prompt).toContain('scene_cards.dialogue_goals')
    expect(prompt).toContain('scene_cards.style_directives')
    expect(prompt).toContain('scene_cards.benchmark_recall_directives')
    expect(prompt).toContain('scene_cards.concept_anchor_rules')
    expect(prompt).toContain('scene_cards.prose_craft_directives')
    expect(prompt).toContain('scene_cards.relationship_progression_plan')
    expect(prompt).toContain('scene_cards.relationship_buffer_zone')
    expect(prompt).toContain('scene_cards.supporting_character_action')
    expect(prompt).toContain('scene_cards.attitude_shift_checkpoint')
    expect(prompt).toContain('scene_cards.relationship_next_hook')
    expect(prompt).toContain('配角攻略缓冲区')
  })

  test('persists a non-duplicate generated title only when title uniqueness repair is active', () => {
    const titleReport = {
      status: 'warn',
      normalized_title: '门外学生',
      duplicates: [{ id: 1, chapter_no: 1, title: '第1章 门外学生' }],
    }

    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, titleReport, '校徽敲门')).toEqual({ title: '校徽敲门' })
    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, titleReport, '门外学生')).toEqual({})
    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, { status: 'ok' }, '校徽敲门')).toEqual({})
  })

  test('wires generated duplicate-title repair into every chapter store path', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const storagePatchSource = readChapterProseStoragePatchSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const groupBlock = source.slice(groupStart, source.indexOf('const routes', groupStart) > 0 ? source.indexOf('const routes', groupStart) : source.indexOf('return { generateChapterForGroup', groupStart))

    expect(groupBlock).toContain('const generatedTitlePatch = buildGeneratedChapterTitlePatch')
    expect((groupBlock.match(/generatedTitlePatch,/g) || []).length).toBeGreaterThanOrEqual(2)
    expect(storagePatchSource).toContain('...(input.generatedTitlePatch || {})')
  })

  test('converts target chapter outlines into fallback scene cards', () => {
    const sceneCards = normalizeSceneCardsPayload({
      master_outline: { title: '超人的规则怪谈世界' },
      chapter_outlines: [
        {
          chapter_no: 1,
          title: '双魂降临',
          summary: '李辰和林智同时醒来在诡异公寓中。',
          conflict: '初次面对禁止单独行动规则的考验',
          ending_hook: '广播响起：今晚零点前必须选定房间。',
        },
        {
          chapter_no: 2,
          title: '守则初读',
          summary: '两人找到公寓守则册。',
        },
      ],
    }, {
      chapter_target: {
        chapter_no: 1,
        title: '双魂降临',
      },
    })

    expect(sceneCards).toHaveLength(1)
    expect(sceneCards[0].scene_no).toBe(1)
    expect(sceneCards[0].title).toBe('双魂降临')
    expect(sceneCards[0].purpose).toContain('李辰和林智')
    expect(sceneCards[0].conflict).toContain('禁止单独行动')
    expect(sceneCards[0].turning_point).toContain('广播响起')
    expect(sceneCards[0].scene_type).toBe('investigation')
  })

  test('preserves commercial reader-facing beats for prose generation', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          scene_no: 1,
          title: '操场醒来',
          purpose: '主角发现自己进入午夜校园。',
          beat: '车祸醒来后确认超人力量。',
          opening_hook: '车祸后的第一口冷风带着广播电流声。',
          reader_payoff: '立刻展示超人身体素质，但规则空间能反制蛮力。',
          fear_point: '空无一人的校园里，阴影会吞掉尾音。',
          rule_pressure: '十点后不得离开宿舍，违规者会消失。',
          information_gap: '校园为什么没有人，广播是谁发出的。',
          reversal: '李超以为自己能冲出去，却被无形墙弹回。',
          ending_hook_seed: '钟表停在九点五十八分。',
          character_voice: '李超热血嘴硬，张智冷静拆规则。',
        },
      ],
    })

    expect(sceneCards[0].opening_hook).toContain('车祸')
    expect(sceneCards[0].reader_payoff).toContain('超人')
    expect(sceneCards[0].fear_point).toContain('阴影')
    expect(sceneCards[0].rule_pressure).toContain('十点')
    expect(sceneCards[0].information_gap).toContain('广播')
    expect(sceneCards[0].reversal).toContain('弹回')
    expect(sceneCards[0].ending_hook_seed).toContain('九点五十八分')
    expect(sceneCards[0].character_voice).toContain('张智')
  })
})
