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

describe('chapter pre-draft brief core b', () => {
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

  test('hydrates incomplete explicit state tracking contract from context sources', () => {
    const contextPackage = {
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
              items: ['旧印章'],
              knowledge_scope: ['知道旧印章背面有第二个名字'],
            },
          },
        ],
      },
      setting_context: {
        required: ['旧印章规则'],
        entities: [
          {
            entity_type: 'rule',
            name: '旧印章规则',
            summary: '旧印章只能由继承人按在证词背面才会显形。',
            constraints: { trigger: '按在证词背面', cost: '暴露继承人身份' },
          },
          {
            entity_type: 'foreshadowing',
            name: '第二个名字',
            summary: '上一章旧印章背面露出的名字，指向失踪证人。',
            state: { planted_chapter: 14, status: '待回收' },
          },
        ],
      },
      chapter_target: {
        chapter_no: 15,
        title: '残留复核',
        summary: '李玄按旧印章规则复核证词。',
        conflict: '他必须在暴露继承人身份前逼出证人反应。',
        state_tracking_contract: {
          version: 'oh_story_state_tracking_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须先确认状态来源再写正文。'],
        },
        scene_cards: [
          { scene_no: 1, title: '庭外复核', characters_present: ['李玄'], purpose: '接住旧印章背面的名字。' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '残阵问道' }, contextPackage)

    expect(brief.state_tracking_contract.source).toBe('manual_incomplete')
    expect(brief.state_tracking_contract.quality_checks).toEqual(['必须先确认状态来源再写正文。'])
    expect(brief.state_tracking_contract.character_states.join('｜')).toContain('李玄')
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toContain('第二个名字')
    expect(brief.state_tracking_contract.world_constraints.join('｜')).toContain('旧印章规则')
    expect(brief.state_tracking_contract.source_readiness.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'previous_chapter',
      'character_state',
      'foreshadowing_history',
      'world_constraints',
    ]))
  })

  test('hydrates camelCase explicit state tracking contract without recursive overflow', () => {
    const contextPackage = {
      continuity: {
        previous_chapter: {
          chapter_no: 1,
          title: '异常入局',
          ending_hook: '金色符文说明规则背后有人动手脚。',
        },
      },
      story_state: {
        characters: [
          {
            name: '江哲',
            current_state: {
              location: '红雾公寓门口',
              items: ['规则纸条'],
              knowledge_scope: ['知道规则五被篡改'],
            },
          },
        ],
      },
      setting_context: {
        required: ['规则五'],
        entities: [
          {
            entity_type: 'rule',
            name: '规则五',
            summary: '红雾公寓里被篡改的旧规则。',
            constraints: { trigger: '照旧法行动', cost: '扩大封印裂缝' },
          },
        ],
      },
      chapterTarget: {
        chapterNo: 2,
        title: '旧法失准',
        summary: '江哲按旧法试探规则，发现旧答案已经失准。',
        conflict: '旧办法会扩大封印裂缝。',
        stateTrackingContract: {
          version: 'oh_story_state_tracking_v1',
          source: 'manual_camel_incomplete',
          qualityChecks: ['必须先确认 camelCase 状态来源再写正文。'],
        },
        sceneCards: [
          { sceneNo: 1, title: '红雾门口', charactersPresent: ['江哲'], purpose: '确认规则五失准。' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '红雾电梯' }, contextPackage)

    expect(brief.state_tracking_contract.source).toBe('manual_camel_incomplete')
    expect(brief.state_tracking_contract.quality_checks).toEqual(['必须先确认 camelCase 状态来源再写正文。'])
    expect(brief.state_tracking_contract.character_states.join('｜')).toContain('江哲')
    expect(brief.state_tracking_contract.historical_causality.join('｜')).toContain('金色符文')
    expect(brief.state_tracking_contract.world_constraints.join('｜')).toContain('规则五')
    expect(brief.state_tracking_contract.source_readiness.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'previous_chapter',
      'character_state',
      'world_constraints',
    ]))
  })

  test('adds an oh-story intent confirmation contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 15,
        title: '袖口旧印',
        summary: '李玄用禁门印记反推出协会会长才是幕后换证人。',
        conflict: '会长想把旧铺掌柜的出现解释成巧合，执事继续逼林青禾改口。',
        emotional_curve: '压迫 -> 信息差反杀 -> 爽感释放',
        ending_hook: '旧铺掌柜喊出会长二十年前的本名。',
        style_sample_strategy: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压后爆，爆发后用一段冷却承接下一钩子',
          matched_chapter_techniques: ['短句停顿', '问非所答制造潜台词'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '会长压场',
            purpose: '把会长的解释权压到最高。',
            conflict: '会长宣布旧铺掌柜只是冒名者。',
            opening_hook: '会长袖口的旧印和禁门印记只差一笔。',
            characters_present: ['李玄', '林青禾', '协会会长', '执事'],
            information_gap: '会长为什么有旧铺印记。',
          },
          {
            scene_no: 2,
            title: '一笔反证',
            purpose: '让李玄用旧印差异反证会长说谎。',
            conflict: '执事想抢走禁门拓印。',
            characters_present: ['李玄', '协会会长', '旧铺掌柜'],
            reader_payoff: '信息差反杀，会长第一次失态。',
            reversal: '旧铺掌柜认出会长二十年前的本名。',
            state_changes_expected: ['会长从掌控者变成被质询者', '李玄从被审者变成追问者'],
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
      { chapter_no: 15, title: '袖口旧印' },
    )

    expect(brief.intent_confirmation_contract.version).toBe('oh_story_intent_confirmation_v1')
    expect(brief.intent_confirmation_contract.confirmed_intent).toContain('信息差反杀')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('先压后爆')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('短句停顿')
    expect(brief.intent_confirmation_contract.structure_inputs.join('｜')).toContain('内容概括')
    expect(brief.intent_confirmation_contract.structure_inputs.join('｜')).toContain('逻辑线')
    expect(brief.intent_confirmation_contract.execution_focus.join('｜')).toContain('爽点出手前先铺')
    expect(brief.intent_confirmation_contract.execution_focus.join('｜')).toContain('差异化反应')
    expect(brief.intent_confirmation_contract.dialogue_tone_baseline.join('｜')).toContain('高压/生死/悲痛 beat')
    expect(brief.intent_confirmation_contract.dialogue_tone_baseline.join('｜')).toContain('轻快配角声线让位')
    expect(brief.intent_confirmation_contract.dialogue_tone_baseline.join('｜')).toContain('信息型配角不当科普嘴')
    expect(confirmedContext.chapter_target.intent_confirmation_contract.quality_checks.join('｜')).toContain('意图确认')
    expect(confirmedContext.chapter_target.intent_confirmation_contract.dialogue_tone_baseline.join('｜')).toContain('对话逐句承接对方情绪')
    expect(prompt).toContain('【意图确认合同】')
    expect(prompt).toContain('执行 chapter_target.intent_confirmation_contract')
    expect(prompt).toContain('情绪+节奏+模块+文风指令')
    expect(prompt).toContain('内容概括决定起承转合')
    expect(prompt).toContain('对白基调约束')
    expect(prompt).toContain('轻快配角声线让位')
    expect(prompt).toContain('信息型配角不当科普嘴')
    expect(prompt).toContain('intent_confirmation_checks')
    expect(prompt.indexOf('【意图确认合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit intent confirmation from blueprint and style recall', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        title: '雨夜旧账',
        summary: '李玄用雨夜旧账把会长的证词逼出破绽。',
        conflict: '会长连续压问，试图让林青禾改口。',
        emotional_curve: '压迫 -> 试探 -> 信息差反杀',
        intent_confirmation_contract: {
          version: 'oh_story_intent_confirmation_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须证明意图确认已落正文。'],
        },
        chapter_blueprint: {
          version: 'oh_story_chapter_blueprint_v1',
          target_emotion: '压迫后信息差反杀',
          opening_hook: '雨夜旧账第一行金额不对。',
          core_payoff: '李玄用旧账金额反证会长说谎。',
          content_outline: {
            cause: '会长在雨夜审讯中抢先定义证词。',
            development: '李玄发现旧账金额和袖口旧印对应。',
            turn: '林青禾顶住压力说出旧账来源。',
            climax: '李玄当众反证会长调换证据。',
            ending: '旧账缺页露出内门印记。',
          },
          plot_lines: {
            mainline: '旧账反证会长。',
            logic_line: '压问 -> 旧账金额 -> 袖口旧印 -> 反证会长',
          },
          character_order: ['会长', '林青禾', '李玄'],
          beat_sequence: [{ beat_no: 1, scene_no: 1, title: '雨夜压问', action: '会长压问林青禾', function_tag: '铺垫', payoff: '压力成型' }],
          cost_and_reward: '代价：林青禾公开得罪会长；收益：李玄拿到反证入口。',
          ending_contract: {
            next_chapter_pull: '旧账缺页露出内门印记。',
          },
        },
        style_sample_strategy: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '三轮压问后半拍亮证据',
          matched_chapter_techniques: ['短句压迫', '证据晚半拍亮出'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)

    expect(brief.intent_confirmation_contract.source).toBe('manual_incomplete')
    expect(brief.intent_confirmation_contract.confirmed_intent).toContain('信息差反杀')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('短句压迫')
    expect(brief.intent_confirmation_contract.structure_inputs.join('｜')).toContain('内容概括')
    expect(brief.intent_confirmation_contract.structure_inputs.join('｜')).toContain('逻辑线')
    expect(brief.intent_confirmation_contract.quality_checks).toEqual(['必须证明意图确认已落正文。'])
  })

  test('turns intent confirmation recall boundaries and blueprint focus into actionable contract items', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        title: '旧账落印',
        summary: '李玄用旧账缺页和袖口旧印逼会长承认换证。',
        emotional_curve: '压迫 -> 反证 -> 余波',
        chapter_blueprint: {
          version: 'oh_story_chapter_blueprint_v1',
          target_emotion: '压迫后反证释放',
          content_outline: {
            cause: '会长先声夺人，把旧账定义成伪证。',
            development: '李玄引导林青禾说出旧账缺页来历。',
            turn: '旧印缺笔和会长袖口暗纹对上。',
            climax: '李玄公开反证会长二十年前换过证人。',
            ending: '旧账缺页背后出现内门编号。',
          },
          plot_lines: {
            logic_line: '旧账缺页 -> 旧印缺笔 -> 袖口暗纹 -> 会长换证',
          },
          character_order: ['会长', '林青禾', '李玄', '旧铺掌柜'],
          cost_and_reward: '代价：林青禾公开站队；收益：李玄夺回审讯解释权。',
          ending_contract: {
            next_chapter_pull: '内门编号把矛头指向禁库。',
          },
        },
        style_sample_strategy: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '三轮压问后半拍亮证据，爆发后短冷却接钩子',
          matched_chapter_techniques: ['问非所答制造潜台词', '证据晚半拍亮出'],
          style_directives: ['对白短促，动作承接情绪余波'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const rhythmAndStyle = brief.intent_confirmation_contract.rhythm_and_style.join('｜')
    const executionFocus = brief.intent_confirmation_contract.execution_focus.join('｜')

    expect(rhythmAndStyle).toContain('文风召回边界')
    expect(rhythmAndStyle).toContain('只学结构节奏')
    expect(rhythmAndStyle).toContain('不得复制')
    expect(executionFocus).toContain('内容概括')
    expect(executionFocus).toContain('旧账定义成伪证')
    expect(executionFocus).toContain('逻辑线')
    expect(executionFocus).toContain('旧账缺页 -> 旧印缺笔')
    expect(executionFocus).toContain('出场顺序')
    expect(executionFocus).toContain('代价/收益')
    expect(executionFocus).toContain('章尾承接')
  })

  test('adds an oh-story benchmark recall brief to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        emotional_curve: '压迫 -> 试探 -> 信息差反杀',
        style_sample_strategy: {
          style_profile_summary: '短句推进审讯压力，对白留半拍，动作句只保留能改变信息差的细节。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出', '旁观者差异化反应'],
          gaps: {
            matched_deep_dive_missing: true,
            conflict: '文风摘要偏冷，情绪模块要求更强爽感释放',
          },
        },
        chapter_benchmark_strategy: {
          benchmark_recall: {
            matched_chapter_K: '第12章_雨巷审讯',
            anchor_excerpts: ['原文锚点只作节奏参考，不进入正文'],
          },
          style_directives: ['章末只留未解问题，不提前解释换证动机'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨夜审讯',
            purpose: '让执事连续压问，制造证词被抢占的压力。',
            conflict: '李玄必须在证词被定性前找到反证入口。',
            characters_present: ['李玄', '执事', '林青禾', '旁观弟子'],
            reader_payoff: '证据反杀，执事失态。',
            ending_hook_seed: '旧账册缺页露出内门印记。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief.version).toBe('oh_story_benchmark_recall_v1')
    expect(brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(brief.benchmark_recall_brief.rhythm_reference).toContain('先压三轮')
    expect(brief.benchmark_recall_brief.style_profile_summary).toContain('短句推进')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques).toContain('三轮压问')
    expect(brief.benchmark_recall_brief.matched_chapter).toContain('第12章')
    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('matched_deep_dive_missing')
    expect(confirmedContext.chapter_target.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(prompt).toContain('【文风召回简报】')
    expect(prompt).toContain('执行 chapter_target.benchmark_recall_brief')
    expect(prompt).toContain('selected_emotion_module')
    expect(prompt).toContain('matched_deep_dive_missing')
    expect(prompt).toContain('同章深度拆解缺失')
    expect(prompt).toContain('已回退黄金三章/文风技巧')
    expect(prompt).toContain('文风摘要偏冷')
    expect(prompt.indexOf('【文风召回简报】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('passes primary benchmark anchor excerpts into prose prompt with copy boundary', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '主对标文风：短句推进审讯压力，对白留半拍。',
          matched_chapter: '主对标第12章_雨巷审讯',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          anchor_excerpts: [
            '雨声贴着瓦檐往下压。掌柜没有立刻辩解，只把账册翻到缺页前一行，让所有人先看见那枚旧印。',
            '他问得很轻，像把刀背放在桌上。等对面第三次否认，才把缺口推到灯下。',
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:03:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief.anchor_excerpts.join('｜')).toContain('账册翻到缺页前一行')
    expect(prompt).toContain('原文锚点片段')
    expect(prompt).toContain('账册翻到缺页前一行')
    expect(prompt).toContain('只用于学习句长、停顿、潜台词和信息释放手法')
    expect(prompt).toContain('不得复制锚点原句、桥段、设定、角色名或专名')
  })

  test('reads camelCase preDraftBrief Step 2 contracts in paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      {
        preDraftBrief: {
          stateTrackingContract: {
            version: 'oh_story_state_tracking_v1',
            sourceReadiness: [{ key: 'previous_chapter', label: '上一章正文', status: 'ready', evidence: '旧印裂口已出现第二枚门牌。' }],
            characterStates: ['李玄左手仍握旧印，不能突然空手。'],
            historicalCausality: ['第二枚门牌来自上一章旧印裂口，必须先接住。'],
            worldConstraints: ['门牌归属只能由当场证据触发。'],
            filterRules: ['旧案旁支不影响本章判定，不进入正文解释。'],
            sourceRequirements: ['上一章结尾', '追踪/伏笔.md'],
            qualityChecks: ['只使用会影响本章正确性的状态。'],
          },
          intentConfirmationContract: {
            version: 'oh_story_intent_confirmation_v1',
            confirmedIntent: '本章只写第二枚门牌的代价归属，不扩展外门大案。',
            rhythmAndStyle: ['先压三轮，再半拍亮证据。'],
            structureInputs: ['旧印裂口 -> 执事索印 -> 门牌显名'],
            executionFocus: ['爽点出手前先铺可指认危机。'],
            dialogueToneBaseline: ['高压场景里配角不能轻快插科打诨。'],
            qualityChecks: ['必须证明意图确认已落正文。'],
          },
          benchmarkRecallBrief: {
            version: 'oh_story_benchmark_recall_v1',
            selectedEmotionModule: 'M03 信息差反杀',
            rhythmReference: '三轮压问后半拍亮证据',
            styleProfileSummary: '短句推进审讯压力，对白留半拍。',
            matchedChapterTechniques: ['证据晚半拍亮出'],
            styleDirectives: ['动作压对白'],
            canonicalSourceRules: ['文风.md 只管表达层'],
            gaps: ['matched_deep_dive_missing'],
            qualityChecks: ['不得复制对标桥段。'],
          },
          styleBoundaryContract: {
            version: 'oh_story_style_boundary_v1',
            styleOverrideRules: ['只调整句长、停顿和对白比例。'],
            hardConstraints: ['硬约束永远赢。'],
            copyBoundaryRules: ['不得复制样章桥段。'],
            qualityChecks: ['检查文风覆盖边界。'],
          },
        },
        chapter_target: {
          chapter_no: 22,
          title: '第二枚门牌',
          summary: '李玄用第二枚门牌逼出归属代价。',
          conflict: '执事要夺走旧印。',
          ending_hook: '第二枚门牌背面出现母亲旧名。',
          scene_cards: [
            { scene_no: 1, title: '旧印裂口', purpose: '承接第二枚门牌。', conflict: '执事索印。' },
          ],
        },
      },
      null,
      { chapter_no: 22, title: '第二枚门牌' },
    )

    expect(prompt).toContain('【状态筛选合同】')
    expect(prompt).toContain('旧印裂口已出现第二枚门牌')
    expect(prompt).toContain('李玄左手仍握旧印')
    expect(prompt).toContain('旧案旁支不影响本章判定')
    expect(prompt).toContain('【意图确认合同】')
    expect(prompt).toContain('本章只写第二枚门牌的代价归属')
    expect(prompt).toContain('先压三轮，再半拍亮证据')
    expect(prompt).toContain('【文风召回简报】')
    expect(prompt).toContain('M03 信息差反杀')
    expect(prompt).toContain('三轮压问后半拍亮证据')
    expect(prompt).toContain('【文风覆盖边界合同】')
    expect(prompt).toContain('只调整句长、停顿和对白比例')
    expect(prompt).toContain('硬约束永远赢')
    expect(prompt).toContain('不得复制样章桥段')
  })

  test('turns oh-story daily workflow into explicit prose execution gates', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 21,
        title: '门牌追问',
        summary: '李玄只追问会影响门牌归属判定的状态，用旧印逼执事露出规则漏洞。',
        conflict: '执事试图用无关旧案分散注意力。',
        state_tracking_contract: {
          version: 'oh_story_state_tracking_v1',
          character_states: ['李玄左手持有旧印，不能突然空手。'],
          historical_causality: ['门牌翻面后会改写归属判定。'],
          world_constraints: ['归属判定只能由当场证据触发。'],
          filter_rules: ['旧案旁支不影响本章判定，不进入正文解释。'],
          quality_checks: ['只使用会影响本章正确性的状态。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧印追问',
            goal: '逼执事承认门牌归属判定条件。',
            conflict: '执事抛出旧案旁支转移焦点。',
            turning_point: '旧印烫出当前归属人姓名。',
            reader_payoff: '李玄用当场证据反制执事。',
          },
        ],
      },
    }

    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      contextPackage,
      null,
      { chapter_no: 21, title: '门牌追问' },
    )

    expect(prompt).toContain('oh-story 日更工作流')
    expect(prompt).toContain('状态筛选')
    expect(prompt).toContain('只加载/只使用会影响本章正确性的状态')
    expect(prompt).toContain('不知道就会写错')
    expect(prompt).toContain('status_filter_receipts')
    expect(prompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks')
    expect(prompt).toContain('场景执行门禁')
    expect(prompt).toContain('goal -> obstacle -> action -> turn -> payoff -> state_delta')
    expect(prompt).toContain('turning_point')
    expect(prompt).toContain('reader_payoff')
    expect(prompt).toContain('scene_card_receipts')
  })

  test('keeps matched chapter source paths in benchmark recall brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        style_sample_strategy: {
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_path: '对标/旧城诡案/文风.md',
          module_source_path: '对标/旧城诡案/剧情/情绪模块.md',
          rhythm_source_path: '对标/旧城诡案/剧情/节奏.md',
          benchmark_recall: {
            matched_chapter_summary_path: '对标/旧城诡案/章节/第12章_摘要.md',
            matched_chapter_deep_dive_path: '对标/旧城诡案/章节/第12章_深度拆解.md',
          },
        },
        chapter_benchmark_strategy: {
          benchmark_recall: {
            matched_chapter_K: '第12章_雨巷审讯',
            fallback_deep_dive_path: '对标/旧城诡案/章节/第1-3章_深度拆解.md',
          },
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:01:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief.source_paths).toEqual(expect.arrayContaining([
      '对标/旧城诡案/文风.md',
      '对标/旧城诡案/剧情/情绪模块.md',
      '对标/旧城诡案/剧情/节奏.md',
      '对标/旧城诡案/章节/第12章_摘要.md',
      '对标/旧城诡案/章节/第12章_深度拆解.md',
      '对标/旧城诡案/章节/第1-3章_深度拆解.md',
    ]))
    expect(brief.benchmark_recall_brief.style_profile_path).toBe('对标/旧城诡案/文风.md')
    expect(brief.benchmark_recall_brief.module_source_path).toBe('对标/旧城诡案/剧情/情绪模块.md')
    expect(brief.benchmark_recall_brief.rhythm_source_path).toBe('对标/旧城诡案/剧情/节奏.md')
    expect(brief.benchmark_recall_brief.matched_chapter_summary_path).toBe('对标/旧城诡案/章节/第12章_摘要.md')
    expect(brief.benchmark_recall_brief.matched_chapter_deep_dive_path).toBe('对标/旧城诡案/章节/第12章_深度拆解.md')
    expect(brief.benchmark_recall_brief.fallback_deep_dive_path).toBe('对标/旧城诡案/章节/第1-3章_深度拆解.md')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('剧情/情绪模块.md')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('剧情/节奏.md')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('文风.md 只管表达层')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('冲突时以情绪模块/节奏为准')
    expect(prompt).toContain('source_paths：对标/旧城诡案/文风.md')
    expect(prompt).toContain('style_profile_path：对标/旧城诡案/文风.md')
    expect(prompt).toContain('module_source_path：对标/旧城诡案/剧情/情绪模块.md')
    expect(prompt).toContain('rhythm_source_path：对标/旧城诡案/剧情/节奏.md')
    expect(prompt).toContain('matched_chapter_summary_path：对标/旧城诡案/章节/第12章_摘要.md')
    expect(prompt).toContain('matched_chapter_deep_dive_path：对标/旧城诡案/章节/第12章_深度拆解.md')
    expect(prompt).toContain('fallback_deep_dive_path：对标/旧城诡案/章节/第1-3章_深度拆解.md')
    expect(prompt).toContain('canonical_source_rules')
    expect(prompt).toContain('文风.md 只管表达层')
    expect(prompt).toContain('冲突时以情绪模块/节奏为准')
    expect(prompt).toContain('对标/旧城诡案/章节/第12章_摘要.md')
    expect(prompt).toContain('对标/旧城诡案/章节/第12章_深度拆解.md')
    expect(prompt).toContain('对标/旧城诡案/章节/第1-3章_深度拆解.md')
  })

  test('keeps secondary benchmark recall as structure-only context and blocks style contamination', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '主对标文风：短句推进审讯压力，对白留半拍。',
          matched_chapter: '主对标第12章_雨巷审讯',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          source_paths: [
            '对标/旧城诡案/文风.md',
            '对标/旧城诡案/章节/第12章_深度拆解.md',
          ],
          secondary_benchmark_recall_summary: [
            {
              book_title: '副书A',
              citation_strength: '辅',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 2,
              usage: '只参考证据链分批释放结构，不进入文风/原文锚点。',
            },
            {
              book_title: '副书B',
              citation_strength: '参考',
              relevance: '弱相关',
              recall_stage: '设定',
              recall_count: 1,
              usage: '只参考协会层级压迫，不读取副书文风.md。',
            },
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:02:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(brief.benchmark_recall_brief.secondary_benchmark_recall_summary).toHaveLength(2)
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('副对标只用于结构/情绪/设定参考')
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('副书不进文风')
    expect(prompt).toContain('副对标召回摘要')
    expect(prompt).toContain('副书A')
    expect(prompt).toContain('只参考证据链分批释放结构')
    expect(prompt).toContain('副书不进文风、不进原文锚点')
    expect(prompt).toContain('secondary_benchmark_boundary')
    expect(prompt).toContain('主对标最多 1 本用于文风和原文锚点')
    expect(reviewPromptBlock).toContain('副对标召回摘要')
    expect(reviewPromptBlock).toContain('副书文风污染')
  })

  test('orders secondary benchmark recall by oh-story relevance and trims entries within stage budget', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '主对标文风：短句推进审讯压力，对白留半拍。',
          secondary_benchmark_total_budget: 5,
          benchmark_registry_missing: true,
          secondary_benchmark_recall_summary: [
            {
              book_title: '副弱书',
              citation_strength: '参考',
              relevance: '弱相关',
              recall_stage: '设定',
              recall_count: 2,
              usage: '只参考组织层级，不进入文风。',
            },
            {
              book_title: '副同题材辅书',
              citation_strength: '辅',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 4,
              registry_order: 2,
              usage: '只参考证据链分批释放结构。',
            },
            {
              book_title: '副同题材参考书',
              citation_strength: '参考',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 3,
              registry_order: 1,
              usage: '只参考章节钩子组合。',
            },
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:02:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const rows = brief.benchmark_recall_brief.secondary_benchmark_recall_summary

    expect(rows.map((row: any) => row.book_title)).toEqual(['副同题材辅书', '副同题材参考书', '副弱书'])
    expect(rows.reduce((sum: number, row: any) => sum + Number(row.recall_count || 0), 0)).toBe(5)
    expect(rows[1].budget_trimmed).toBe(true)
    expect(rows[1].recall_count).toBe(1)
    expect(rows[2].recall_count).toBe(0)
    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('benchmark_registry_missing')
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('同题材 > 弱相关 > 参考')
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('裁剪召回条目，不删除书目记录')
    expect(prompt).toContain('副同题材辅书')
    expect(prompt.indexOf('副同题材辅书')).toBeLessThan(prompt.indexOf('副同题材参考书'))
    expect(prompt).toContain('benchmark_registry_missing')
    expect(prompt).toContain('裁剪召回条目，不删除书目记录')
  })

  test('carries secondary benchmark boundaries into write preparation checks', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '主对标文风：短句推进审讯压力，对白留半拍。',
          gaps: ['gaps.main_benchmark_unspecified: true'],
          benchmark_registry_missing: true,
          secondary_benchmark_recall_summary: [
            {
              book_title: '副书A',
              citation_strength: '辅',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 2,
              usage: '只参考证据链分批释放结构，不进入文风/原文锚点。',
            },
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-28T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const writePreparationBrief = brief.write_preparation_brief

    expect(writePreparationBrief.readiness_status).toBe('needs_context')
    expect(writePreparationBrief.source_gaps.join('｜')).toContain('benchmark_registry_missing')
    expect(writePreparationBrief.source_gaps.join('｜')).toContain('main_benchmark_unspecified')
    expect(writePreparationBrief.must_confirm.join('｜')).toContain('主对标最多 1 本')
    expect(writePreparationBrief.must_confirm.join('｜')).toContain('副书不进文风、不进原文锚点')
    expect(writePreparationBrief.execution_order.join('｜')).toContain('secondary_benchmark_boundary')
    expect(prompt).toContain('文风召回：benchmark_registry_missing')
    expect(prompt).toContain('benchmark_registry_missing')
    expect(prompt).toContain('写前必确认')
    expect(prompt).toContain('副书不进文风、不进原文锚点')
    expect(prompt).toContain('文风召回缺口和副对标边界')
    expect(prompt.indexOf('benchmark_registry_missing')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })


})
