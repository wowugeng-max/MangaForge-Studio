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

describe('chapter pre-draft brief core b 1', () => {
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
})
