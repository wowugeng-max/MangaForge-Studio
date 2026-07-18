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

describe('normalizeSceneCardsPayload handoff b b', () => {
  test('detects scene-card purpose tags that are executed with the wrong prose weight', () => {
    const checks = scanScenePurposeWeightRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            purpose_tag: '打脸',
            purpose: '江辰用第二本账册当众反证。',
            reader_payoff: '执事改口，旁观弟子倒戈。',
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            purpose_tag: '过渡',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰拿出第二本账册，执事改口，众人震惊。',
      '',
      '江辰赶往钟楼交接旧印。',
      '',
      '雨水从青石板缝里漫上来，他的靴底碾过一道道旧痕，钟楼的阴影像一截潮湿的铁尺压在肩上。',
      '',
      '他穿过廊桥，风从袖口灌进去，旧印被攥得发烫，每一步都像踩在昨夜没熄的灰烬里。',
      '',
      '远处的钟声拖得很长，檐角的水珠一颗一颗落下，砸在他手背上。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['scene_purpose_weight_1_high_underwritten', 'scene_purpose_weight_2_transition_overwritten'])
    expect(checks[0].evidence).toContain('目的词「打脸」')
    expect(checks[0].fix).toContain('危机/期待铺垫')
    expect(checks[1].evidence).toContain('目的词「过渡」')
    expect(checks[1].fix).toContain('1-2 句')
  })
  test('does not flag scene-card purpose weight when payoff scenes expand and transitions stay brief', () => {
    const checks = scanScenePurposeWeightRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            purpose_tag: '打脸',
            purpose: '江辰用第二本账册当众反证。',
            reader_payoff: '执事改口，旁观弟子倒戈。',
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            purpose_tag: '过渡',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册压在审判台上，纸页被掌风掀开，第一行墨迹正对着执事的名字。',
      '',
      '执事伸手去抢，江辰反扣住他的腕骨，把账册翻到朱印页：“你昨夜换的是副本，真账在这里。”',
      '',
      '台下弟子先是屏住呼吸，等旁证签名一露出来，最前排那人立刻后退半步，低声喊出执事的称号。',
      '',
      '执事嘴唇抖了两下，喉结卡在领口上方，半晌才把“误会”两个字咬出来。江辰没有松手，只把账册往前推了半寸。',
      '',
      '原本站在执事身后的两名弟子同时退开，旁观席里有人把刚才的供词撕成两半，倒向江辰这一侧。',
      '',
      '江辰赶往钟楼交接旧印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('detects scene-card sensory anchors missing from final prose', () => {
    const checks = scanSceneSensoryAnchorRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '账本翻页',
            purpose: '江辰翻到账本缺页，确认执事篡改账册。',
            sensory_anchor: '纸张触感粗糙，页角卷曲处有新墨洇开的痕迹',
            required_beats: ['翻到账本缺页', '确认篡改账册'],
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰翻到账本缺页，确认执事篡改账册。',
      '',
      '他抬头看向审判台，把账册递给旁证，示意对方验印。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_sensory_anchor_1_missing')
    expect(checks[0].evidence).toContain('纸张触感粗糙')
    expect(checks[0].fix).toContain('主角主动注意')
    expect(checks[0].fix).toContain('动作、规则、危险或对话判断')
  })
  test('does not flag scene-card sensory anchors when the sensory detail lands in prose', () => {
    const checks = scanSceneSensoryAnchorRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '账本翻页',
            purpose: '江辰翻到账本缺页，确认执事篡改账册。',
            sensory_anchor: '纸张触感粗糙，页角卷曲处有新墨洇开的痕迹',
            required_beats: ['翻到账本缺页', '确认篡改账册'],
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰翻到账本缺页，指腹蹭过纸张粗糙的断边，页角卷曲处还压着一圈新墨洇开的痕迹。',
      '',
      '他没有急着抬头，只把那一页推到旁证面前：“昨夜换过。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('detects scene-card serial risk repair actions missing from final prose', () => {
    const checks = scanSceneSerialRiskRepairRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            purpose: '江辰用账册证据逼盟友改口。',
            required_beats: ['账册证据亮相', '盟友改口'],
            serial_risk_repairs: ['two_chapter_momentum_stall', 'five_chapter_texture_gap'],
            recent_fatigue_action: '用账册新证据推进目标，同时让盟友关系发生可见变化。',
          },
        ],
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_serial_risk_repair_1_missing')
    expect(checks[0].label).toBe('场景近章风险修复检查')
    expect(checks[0].evidence).toContain('two_chapter_momentum_stall')
    expect(checks[0].evidence).toContain('用账册新证据推进目标')
    expect(checks[0].fix).toContain('目标推进')
    expect(checks[0].fix).toContain('关系/世界调剂')
  })
  test('does not flag scene-card serial risk repair actions when the repair lands in prose', () => {
    const checks = scanSceneSerialRiskRepairRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            purpose: '江辰用账册证据逼盟友改口。',
            required_beats: ['账册证据亮相', '盟友改口'],
            serial_risk_repairs: ['two_chapter_momentum_stall', 'five_chapter_texture_gap'],
            recent_fatigue_action: '用账册新证据推进目标，同时让盟友关系发生可见变化。',
          },
        ],
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞，再把下一步目标推到禁库钥匙上。',
      '',
      '原本沉默的盟友终于改口，主动站到他身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('detects scene-card receipts whose evidence is missing from final prose', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
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
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_missing')
    expect(checks[0].label).toBe('场景卡回执证据复核')
    expect(checks[0].status).toBe('fail')
    expect(checks[0].evidence).toContain('盟友主动站到江辰身侧')
    expect(checks[0].fix).toContain('不能信任回执自述')
  })
  test('builds a scene-card receipt sync report from deterministic receipt risks', () => {
    const report = buildSceneCardReceiptSyncReport(
      { title: '旧盟约' },
      { id: 12, chapter_no: 12, title: '旧盟约' },
      {
        generated_scene_breakdown: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            scene_card_receipts: {
              goal_obstacle_change_delivered: true,
              purpose_tag_delivered: true,
              evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
            },
          },
        ],
      },
      '江辰把账册证据亮在桌上，盟友终于改口。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('场景回执缺口 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'scene_card_receipt_1_evidence_missing',
      label: '场景卡回执证据复核',
    })
    expect(report.next_actions.join('｜')).toContain('scene_card_receipts')
  })
  test('audits stored oh-story scene-card receipts when generated scene breakdown is unavailable', () => {
    const checks = scanSceneCardReceiptRisks({
      chapter_target: {
        delivery_receipts: {
          scene_card_receipts: [
            {
              scene_no: 1,
              title: '旧盟约重签',
              delivered: true,
              evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
            },
          ],
        },
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_missing')
    expect(checks[0].evidence).toContain('盟友主动站到江辰身侧')
    expect(checks[0].fix).toContain('不能信任回执自述')
  })
  test('detects undelivered oh-story scene-card receipt fields', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '蓝晶灼手',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            concept_anchor_rules_delivered: false,
            prose_craft_directives_delivered: false,
            evidence: ['蓝晶在她掌心炸出陌生记忆碎片'],
          },
        },
      ],
    }, '蓝晶在她掌心炸出陌生记忆碎片。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_undelivered')
    expect(checks[0].fields).toEqual(expect.arrayContaining(['新概念锚点', '正文工艺指令']))
    expect(checks[0].evidence).toContain('新概念锚点')
  })
  test('detects undelivered showdown scene-card receipt fields', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '审判台反压',
          scene_card_receipts: {
            showoff_stage_chain_delivered: false,
            spectator_interest_shift_delivered: false,
            secondary_showoff_effect_delivered: false,
            combat_result_type_delivered: false,
            combat_dimension_plan_delivered: false,
            combat_reversal_plan_delivered: false,
            evidence: ['江辰公开亮出第二本账册。'],
          },
        },
      ],
    }, '江辰公开亮出第二本账册。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_undelivered')
    expect(checks[0].fields).toEqual(expect.arrayContaining(['公开舞台层级', '旁观者利益变化', '战斗维度计划', '战斗反转计划']))
    expect(checks[0].evidence).toContain('公开舞台层级')
  })
  test('blocks quality gate when scene-card receipt evidence is missing even if score passes', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
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
    }, '江辰把账册证据亮在桌上，盟友终于改口。')

    const decision = getQualityGateDecision({ reference_config: { quality_gate: { enabled: true, min_score: 78 } } }, {
      score: 92,
      revised: true,
      quality_audit_checks: checks,
    })

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('；')).toContain('结构化自检失败')
    expect(decision.reasons.join('；')).toContain('场景卡回执证据复核')
  })
  test('blocks quality gate when next-chapter quality plan is missing even if score passes', () => {
    const decision = getQualityGateDecision({ reference_config: { quality_gate: { enabled: true, min_score: 78 } } }, {
      score: 92,
      revised: true,
      issues: [],
    })

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('；')).toContain('下一章质量续航计划缺失')
  })
  test('does not flag scene-card receipts when delivered evidence is present in prose', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
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
      '江辰把账册新证据亮在桌上，盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('flags scene-card receipt evidence that appears outside the matching scene text', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_text: '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
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
          scene_text: '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
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
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_out_of_scene')
    expect(checks[0].evidence).toContain('不在对应场景文本中')
    expect(checks[0].fix).toContain('对应场景')
  })
  test('flags multi-scene receipts that omit scene boundary anchors', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
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
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧'],
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

    expect(checks).toHaveLength(2)
    expect(checks.map(item => item.key)).toEqual([
      'scene_card_receipt_1_scope_missing',
      'scene_card_receipt_2_scope_missing',
    ])
    expect(checks[0].evidence).toContain('缺少 scene_start_anchor/scene_end_anchor')
    expect(checks[0].fix).toContain('场景边界')
  })
})
