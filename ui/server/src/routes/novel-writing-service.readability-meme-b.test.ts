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

describe('readability meme b', () => {
  test('hydrates incomplete explicit chapter benchmark strategy from sample bank', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      reference_config: {
        chapter_benchmark_sample_bank: [
          {
            sample_key: '规则怪谈第一夜',
            genre: '规则怪谈',
            opening_hook: '开篇 300 字内出现死亡规则和反常边界',
            conflict_pattern: '主角低成本验证规则边界',
            payoff_pattern: '规则反制蛮力，同时给出可学习的生路',
            ending_hook_pattern: '门外出现疑似违规者求助',
            do_not_copy: ['湿漉漉的校服学生站在门外'],
          },
        ],
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '第一条规则',
        summary: '主角验证宿舍规则边界。',
        chapter_benchmark_strategy: {
          enabled: true,
          do_not_copy: ['作者额外禁止复制的桥段'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.chapter_benchmark_strategy.enabled).toBe(true)
    expect(brief.chapter_benchmark_strategy.samples.map((sample: any) => sample.sample_key)).toEqual(['规则怪谈第一夜'])
    expect(brief.chapter_benchmark_strategy.apply_to).toContain('开篇300字')
    expect(brief.chapter_benchmark_strategy.do_not_copy).toContain('作者额外禁止复制的桥段')
    expect(brief.chapter_benchmark_strategy.do_not_copy).toContain('湿漉漉的校服学生站在门外')
  })
  test('checks final prose against chapter benchmark sample strategy after delivery', () => {
    const project = { title: '超人的规则怪谈世界', genre: '规则怪谈', reference_config: {} }
    const chapter = { id: 2, chapter_no: 2, title: '第一条规则' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        chapter_benchmark_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '规则怪谈第一夜',
              opening_hook: '开篇 300 字内出现死亡规则和反常边界',
              conflict_pattern: '主角冲动试探规则，智者用低成本物品验证边界',
              payoff_pattern: '规则反制蛮力，同时给出可学习的生路',
              ending_hook_pattern: '门外出现疑似违规者求助，形成救或不救的选择',
              scene_budget_pattern: '边界验证、队友分歧、外部威胁敲门',
              visual_pattern: '玻璃门、灰白门槛线和黑影清除形成可视化场面',
            },
          ],
        },
      },
    }
    const deliveredText = [
      '开篇三百字内，宿舍广播直接宣布死亡规则，玻璃门外的黑影贴着灰白门槛线游动。',
      '李超想冲出去，张智阻止他，掰下压缩饼干碎屑丢出门槛，低成本验证边界。',
      '黑影清除碎屑，规则反制蛮力，也让三人看见了可学习的生路。',
      '玻璃门、灰白门槛线和黑影清除形成清楚的可视化场面。',
      '最后门外出现疑似违规者求助，三人必须决定救或不救。',
    ].join('\n')
    const weakText = '宿舍里很安静，大家讨论规则。张智觉得先别出去。李超点头。夜色很深。'

    const okReport = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('基准 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('基准缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('章末追读')
    expect(warnReport.next_actions.join('；')).toContain('质量基准样例')
  })
  test('reads chapter benchmark sync strategy from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '旧城维修师', genre: '悬疑', reference_config: {} }
    const chapter = {
      id: 23,
      chapter_no: 23,
      title: '缺页复核',
      raw_payload: {
        preDraftBrief: {
          chapterBenchmarkStrategy: {
            enabled: true,
            samples: [
              {
                sample_key: '缺页反证样例',
                openingHook: '开篇 300 字先给旧账缺页压力。',
                conflictPattern: '执事抢先定义证词，主角用缺页反证。',
                payoffPattern: '旁观者分层倒戈，执事第一次失态。',
                endingHookPattern: '章尾只露禁库编号，不解释幕后。',
              },
            ],
          },
        },
      },
    }
    const report = buildChapterBenchmarkSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 23, title: '缺页复核' } },
      '李玄说旧账有缺页，执事没有回答。审讯暂时继续。',
    )

    expect(report.label).toContain('基准缺口')
    expect(report.planned.map((item: any) => item.sample_key)).toContain('缺页反证样例')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('禁库编号')
  })
  test('story state sync persists a chapter_benchmark_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBenchmarkSync, reviewType: 'chapter_benchmark_sync'")
    expect(source).toContain('buildChapterBenchmarkSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_benchmark_sync = chapterBenchmarkSync')
  })
  test('checks final prose against chapter blueprint after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 8, chapter_no: 8, title: '第二本账册' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 8,
        chapter_blueprint: {
          target_emotion: '压迫后反证爆发',
          opening_hook: '审判庭开场逼江辰按下认罪书血印',
          core_payoff: '江辰用第二本账册当众反证，逼执事改口',
          content_outline: {
            cause: '审判庭以旧账册定罪，江辰被迫承压',
            development: '林青禾拖住证人，账册细节开始互相矛盾',
            turn: '第二本账册出现，旧印章证明账目被调换',
            climax: '执事在众目睽睽下改口，旁观弟子站队倒戈',
            ending: '账册夹层露出禁地钥匙，拉出下一章危险',
          },
          plot_lines: {
            logic_line: '旧账册 -> 第二本账册 -> 旧印章 -> 执事改口',
            relationship_line: '林青禾从旁观转为出手护证',
          },
          character_order: '江辰先被押入审判庭，林青禾随后带证人入场，执事最后亮出旧账册压人',
          cost_and_reward: '江辰暴露第二本账册的同时洗清罪名，得到禁地钥匙线索',
          ending_contract: {
            next_chapter_pull: '禁地钥匙对应第二扇门，门后有人等江辰',
          },
        },
      },
    }
    const deliveredText = [
      '审判庭开场，执事逼江辰把手按向认罪书血印，旧账册被摊在众人面前定罪。',
      '江辰承压不退，林青禾随后带证人入场，先拖住证词，让账册细节开始互相矛盾。',
      '执事最后亮出旧账册压人，江辰才取出第二本账册，又用旧印章证明账目被调换。',
      '逻辑线从旧账册转到第二本账册，再落到旧印章，逼得执事在众目睽睽下改口。',
      '旁观弟子有人沉默，有人倒戈站队；林青禾也从旁观转为出手护证。',
      '代价是江辰暴露了第二本账册，收益是洗清罪名，还得到禁地钥匙线索。',
      '最后账册夹层露出禁地钥匙，第二扇门后有人等江辰，危险留到下一章。',
    ].join('\n')
    const weakText = '江辰在审判庭解释了账册问题。执事有些尴尬，众人都知道他没错了。事情进入下一阶段。'

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('细纲 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('细纲缺口')
    expect(warnReport.missed_count).toBeGreaterThan(0)
    expect(warnReport.missed.map((item: any) => item.label)).toContain('章尾承接')
    expect(warnReport.next_actions.join('；')).toContain('章节细纲')
  })
  test('checks oh-story five-act causal chain in chapter blueprint after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 28, chapter_no: 28, title: '旧印章质变' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 28,
        chapter_blueprint: {
          target_emotion: '压迫后质变反证',
          opening_hook: '审判庭第一句话就是认罪书。',
          core_payoff: '江辰用旧印章让账册调包从怀疑变成铁证。',
          content_outline: {
            cause: '认罪书和旧账册先把江辰压成被告。',
            development: '林青禾拖住证人，账册页序互相矛盾。',
            turn: '旧印章出现，冲突性质从口供争执质变成账册调包铁证。',
            climax: '江辰当众按下旧印章，执事抢证失败后改口。',
            ending: '账册夹层露出禁地钥匙，拉出下一章危险。',
          },
          causal_chain_contract: {
            version: 'oh_story_five_act_causal_chain_v1',
            act_order: ['开局/种子', '发展/生长', '转折/质变', '行动/冲刺', '结局/完成'],
            act_functions: {
              seed: '开局/种子：认罪书和旧账册先把江辰压成被告；因必须在此埋下。',
              growth: '发展/生长：林青禾拖住证人，账册页序互相矛盾；果+因继续生长。',
              turn: '转折/质变：旧印章出现，冲突性质从口供争执质变成账册调包铁证。',
              rush: '行动/冲刺：江辰当众按下旧印章，执事抢证失败后改口；冲突白热化。',
              completion: '结局/完成：账册夹层露出禁地钥匙，果收束并埋下下一因。',
            },
            quality_checks: ['五幕因果链必须五环齐全，不能跳步、不能乱序。'],
          },
          ending_contract: {
            next_chapter_pull: '禁地钥匙对应第二扇门，门后有人等江辰。',
          },
        },
      },
    }
    const causalText = [
      '开局先埋种子：审判庭第一句话就是认罪书，旧账册把江辰压成被告，压迫从第一息就落下。',
      '发展开始生长：林青禾拖住证人，账册页序互相矛盾，旧账册的果又变成下一步追问的因。',
      '转折发生质变：旧印章出现，冲突性质从口供争执变成账册调包铁证，江辰处境也更危险，因为执事开始抢证，反证爽感被压到这一刻才爆发。',
      '行动进入冲刺：江辰当众按下旧印章，执事抢证失败后被迫改口；旁观弟子有人沉默，有人倒戈站队。',
      '结局完成收束：代价是江辰暴露第二本账册，收益是洗清罪名；逻辑线先从旧账册转到旧印章，再落到账册夹层露出禁地钥匙，第二扇门后有人等他，下一因已经埋下。',
    ].join('\n')
    const flatText = [
      '江辰在审判庭解释旧账册。',
      '林青禾说页序有问题，旧印章也出现了。',
      '大家听完后觉得有道理，执事尴尬改口。',
      '事情顺利完成，账册夹层露出禁地钥匙。',
    ].join('\n')

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, causalText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.causal_chain_checks.map((item: any) => item.label)).toContain('五幕因果链')
    expect(okReport.causal_chain_checks.every((item: any) => item.delivered)).toBe(true)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('causal_chain_contract')
    expect(warnReport.missed.find((item: any) => item.key === 'causal_chain_contract')?.missed_items).toEqual(expect.arrayContaining([
      '缺转折质变',
      '转折被解释/总结抹平',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('五幕因果链')
  })
  test('checks chapter blueprint beat density contract after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 31, chapter_no: 31, title: '密度复核' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 31,
        chapter_blueprint: {
          target_emotion: '压迫后密集反证',
          opening_hook: '审判庭开场逼江辰按下认罪书血印',
          core_payoff: '江辰用第二本账册当众反证并洗清罪名',
          beat_density_contract: {
            version: 'oh_story_beat_density_v1',
            target_word_count: 3000,
            min_beat_count: 10,
            target_beat_count: 12,
            max_beat_count: 15,
            current_beat_count: 2,
            density_gap: 8,
            rule: '按字数目标反推情节点数量：约 200-300 字/个情节点；下限 10 个；常规 3000 字章节 10-15 个。',
          },
        },
      },
    }
    const denseText = [
      '审判庭开场，执事逼江辰按下认罪书血印。',
      '江辰把手腕往后一撤，先让血印落空。',
      '林青禾带证人入场，证人交出旧账册缺页。',
      '执事伸手抢账册，江辰反扣住他的腕骨。',
      '第二本账册从证人袖中滑出，编号正对旧账缺页。',
      '江辰把旧印章压上编号，墨迹立刻浮出调包痕迹。',
      '执事改口前还想毁页，林青禾挡住火折子。',
      '旁观弟子分成两拨，有人退后，有人站到江辰身侧。',
      '江辰当众反证完成，洗清罪名，却暴露了第二本账册。',
      '账册夹层露出禁地钥匙，第二扇门后的名字被血印遮住。',
    ].join('\n')
    const summaryText = [
      '江辰在审判庭解释了账册问题。',
      '执事有些尴尬，众人都知道他没错了。',
      '事情进入下一阶段。',
    ].join('\n')

    const denseReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, denseText)
    const summaryReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, summaryText)

    expect(denseReport.craft_checks.find((item: any) => item.key === 'beat_density')?.status).toBe('ok')
    expect(summaryReport.status).toBe('warn')
    expect(summaryReport.craft_checks.find((item: any) => item.key === 'beat_density')?.status).toBe('warn')
    expect(summaryReport.missed.map((item: any) => item.label)).toContain('情节点密度')
    expect(summaryReport.missed.find((item: any) => item.key === 'craft_beat_density')?.text).toContain('200-300 字/个情节点')
    expect(summaryReport.next_actions.join('；')).toContain('情节点密度')
  })
  test('checks chapter blueprint beat function detail allocation after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 32, chapter_no: 32, title: '详略复核' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 32,
        chapter_blueprint: {
          target_emotion: '压迫后细节反证',
          opening_hook: '审判庭开场逼江辰按下认罪书血印',
          core_payoff: '江辰用旧印章让账册调包当众暴露',
          beat_sequence: [
            { beat: '江辰把旧印章压上编号，账册调包痕迹浮出', function_tag: '关键揭露' },
            { beat: '执事抢证失败后改口，旁观弟子倒戈站队', function_tag: '打脸' },
            { beat: '江辰穿过回廊去偏厅', function_tag: '过渡' },
          ],
        },
      },
    }
    const allocatedText = [
      '审判庭开场，执事逼江辰按下认罪书血印。',
      '江辰把旧印章压上编号，墨迹先断成两截，又沿着账册缺页浮出调包痕迹；林青禾盯住页角，低声问：“这枚印是谁保管？”执事伸手就抢。',
      '江辰扣住他的手腕，把旧印章往灯下一翻，印背暗纹正对第二本账册的编号。有人退后，有人当场改口，旁观弟子倒戈站队。',
      '代价是江辰暴露第二本账册，收益是当众证明账册调包。',
      '他穿过回廊去偏厅。',
    ].join('\n')
    const flatText = [
      '审判庭开场，执事逼江辰按下认罪书血印。',
      '江辰用旧印章证明了账册调包，执事抢证失败后改口，旁观弟子都很震惊。',
      '他穿过回廊，回廊很长，灯很冷，墙上的影子一层接一层，风从窗缝里吹进来，他想起很多往事，心里非常复杂，脚步也变得沉重。',
      '事情进入下一阶段。',
    ].join('\n')

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, allocatedText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.craft_checks.find((item: any) => item.key === 'beat_function_detail_balance')?.status).toBe('ok')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.craft_checks.find((item: any) => item.key === 'beat_function_detail_balance')?.status).toBe('warn')
    expect(warnReport.missed.find((item: any) => item.key === 'craft_beat_function_detail_balance')?.text).toContain('关键揭露')
    expect(warnReport.next_actions.join('；')).toContain('目的词详略')
  })
  test('checks oh-story small-outline four-step delivery after prose is written', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 34, chapter_no: 34, title: '小纲复核' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 34,
        chapter_blueprint: {
          small_outline_contract: {
            version: 'oh_story_small_outline_four_step_v1',
            steps: ['分段判断', '标注目的和效果', '标注详写/略写', '快速定位'],
            segment_cards: [
              {
                segment_no: 1,
                segment: '审判庭缺页',
                purpose: '让读者确认缺页不是文书失误而是栽赃入口。',
                intended_effect: '读者感到证据压力升级。',
                detail_level: 'expand',
                quick_locator: '审判庭缺页页序',
              },
              {
                segment_no: 2,
                segment: '回廊转场',
                purpose: '把众人从审判庭带到禁库门口。',
                intended_effect: '压缩转场但保留禁库方向。',
                detail_level: 'compress',
                quick_locator: '穿过回廊到禁库门口',
              },
            ],
          },
        },
      },
    }
    const deliveredText = [
      '审判庭里，江辰把缺页页序摊到众人面前，逼执事承认这不是文书失误，而是有人故意把栽赃入口藏进账册。',
      '证人重新核对页序时，执事的脸色变了，旁观弟子有人沉默，有人退后，读者能看见证据压力从“口头争执”升级成“现场核验”。',
      '代价是江辰暴露核验页序的方法，收益是缺页被当众证明为栽赃证据。',
      '他们穿过回廊到禁库门口，转场只留一笔，缺页背面的禁库编号却被江辰按在门环旁。',
    ].join('\n')
    const weakText = [
      '江辰去了审判庭，大家讨论缺页。',
      '后来他们穿过很长的回廊，墙上有很多影子，空气很冷。',
      '事情进入下一阶段。',
    ].join('\n')

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.small_outline_checks.find((item: any) => item.key === 'small_outline_contract')?.status).toBe('ok')
    expect(okReport.status).toBe('ok')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.small_outline_checks.find((item: any) => item.key === 'small_outline_contract')?.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('small_outline_contract')
    expect(warnReport.missed.find((item: any) => item.key === 'small_outline_contract')?.text).toContain('目的和效果')
    expect(warnReport.next_actions.join('；')).toContain('小纲四步法')
  })
  test('checks oh-story mainline definition after prose is written', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 35, chapter_no: 35, title: '主线复核' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 35,
        chapter_blueprint: {
          mainline_definition_contract: {
            version: 'oh_story_mainline_definition_v1',
            mainline_event: '查清旧账被调包这一件事。',
            action_role: '升级和验阵只是达成旧账反证目标的行动。',
            forbidden_mainline_shapes: ['境界升级条', '金手指元素列表', '地图/设定罗列'],
            quality_checks: ['主线必须是一件事，不是一个元素。'],
          },
        },
      },
    }
    const deliveredText = [
      '这一章只推进一件事：查清旧账被调包。',
      '江辰的验阵升级没有单独变成主线，只是他达成旧账反证目标的行动。',
      '他把旧账、私印和证人页序串成现场证据，逼执事承认账册被换过。',
      '章末旧账背面露出会长私印，第二条主线还没替换当前目标，只作为下一步铺垫。',
    ].join('\n')
    const weakText = [
      '江辰突破了新境界，金手指也升级成第二形态。',
      '新地图、新阵法、新榜单和新门派设定都出现了。',
      '大家讨论这些元素很重要，旧账调包的事以后再说。',
    ].join('\n')

    const okReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildChapterBlueprintSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.mainline_definition_checks.find((item: any) => item.key === 'mainline_definition_contract')?.status).toBe('ok')
    expect(okReport.status).toBe('ok')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.mainline_definition_checks.find((item: any) => item.key === 'mainline_definition_contract')?.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('mainline_definition_contract')
    expect(warnReport.missed.find((item: any) => item.key === 'mainline_definition_contract')?.text).toContain('主线是一件事')
    expect(warnReport.next_actions.join('；')).toContain('主线不等于升级')
  })
  test('reads chapter blueprint sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = {
      id: 25,
      chapter_no: 25,
      title: '缺页复核',
      raw_payload: {
        preDraftBrief: {
          chapterBlueprint: {
            targetEmotion: '压迫后缺页反证爆发',
            openingHook: '复核厅开场，执事逼李玄承认旧账缺页无效。',
            corePayoff: '李玄用空白账页反证执事换证。',
            contentOutline: {
              cause: '执事先定义旧账缺页无效。',
              development: '李玄让证人复述账页顺序。',
              turn: '空白账页编号和禁库编号对上。',
              climax: '执事在众人面前失态改口。',
              ending: '禁库编号指向下一扇门。',
            },
            plotLines: {
              logicLine: '旧账缺页 -> 空白账页 -> 禁库编号 -> 执事改口',
            },
            endingContract: {
              nextChapterPull: '禁库编号指向下一扇门。',
            },
          },
        },
      },
    }
    const report = buildChapterBlueprintSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 25, title: '缺页复核' } },
      '李玄说旧账缺页可能有问题。执事没有继续解释，众人暂时散去。',
    )

    expect(report.label).toContain('细纲缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页')
    expect(report.missed.map((item: any) => item.label)).toContain('章尾承接')
    expect(report.next_actions.join('；')).toContain('章节细纲')
  })
  test('reads stored oh-story chapter blueprint delivery receipts after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = {
      id: 27,
      chapter_no: 27,
      title: '禁库编号',
      raw_payload: {
        oh_story_delivery_receipts: {
          chapter_blueprint: {
            target_emotion: '压迫后禁库编号反证爆发',
            opening_hook: '复核厅开场，执事逼李玄承认旧账缺页无效。',
            core_payoff: '李玄用空白账页反证执事换证。',
            content_outline: {
              cause: '执事先定义旧账缺页无效。',
              development: '李玄让证人复述账页顺序。',
              turn: '空白账页编号和禁库编号对上。',
              climax: '执事在众人面前失态改口。',
              ending: '禁库编号指向下一扇门。',
            },
            plot_lines: {
              logic_line: '旧账缺页 -> 空白账页 -> 禁库编号 -> 执事改口',
            },
            ending_contract: {
              next_chapter_pull: '禁库编号指向下一扇门。',
            },
          },
        },
      },
    }
    const report = buildChapterBlueprintSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 27, title: '禁库编号' } },
      '李玄说旧账缺页可能有问题。执事没有继续解释，众人暂时散去。',
    )

    expect(report.label).toContain('细纲缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页')
    expect(report.missed.map((item: any) => item.label)).toContain('章尾承接')
  })
  test('reads runtime camelCase chapterTarget chapterBlueprint after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 26, chapter_no: 26, title: '禁库编号' }
    const contextPackage = {
      chapterTarget: {
        chapterNo: 26,
        title: '禁库编号',
        chapterBlueprint: {
          targetEmotion: '压迫后禁库编号反证爆发',
          openingHook: '复核厅开场，执事逼李玄承认旧账缺页无效。',
          corePayoff: '李玄用空白账页反证执事换证。',
          contentOutline: {
            cause: '执事先定义旧账缺页无效。',
            development: '李玄让证人复述账页顺序。',
            turn: '空白账页编号和禁库编号对上。',
            climax: '执事在众人面前失态改口。',
            ending: '禁库编号指向下一扇门。',
          },
          plotLines: {
            logicLine: '旧账缺页 -> 空白账页 -> 禁库编号 -> 执事改口',
          },
          endingContract: {
            nextChapterPull: '禁库编号指向下一扇门。',
          },
        },
      },
    }

    const report = buildChapterBlueprintSyncReport(
      project,
      chapter,
      contextPackage,
      '李玄说旧账缺页可能有问题。执事没有继续解释，众人暂时散去。',
    )

    expect(report.label).toContain('细纲缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页')
    expect(report.missed.map((item: any) => item.label)).toContain('章尾承接')
    expect(report.next_actions.join('；')).toContain('章节细纲')
  })
  test('flags oh-story blueprint craft gaps even when outline beats are mentioned', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 8, chapter_no: 8, title: '第二本账册' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 8,
        chapter_blueprint: {
          target_emotion: '压迫后反证爆发',
          opening_hook: '审判庭开场逼江辰按下认罪书血印',
          core_payoff: '江辰用第二本账册当众反证，逼执事改口',
          content_outline: {
            cause: '审判庭以旧账册定罪，江辰被迫承压',
            development: '林青禾拖住证人，账册细节开始互相矛盾',
            turn: '第二本账册出现，旧印章证明账目被调换',
            climax: '执事在众目睽睽下改口，旁观弟子站队倒戈',
            ending: '账册夹层露出禁地钥匙，拉出下一章危险',
          },
          plot_lines: {
            logic_line: '旧账册 -> 第二本账册 -> 旧印章 -> 执事改口',
          },
          character_order: '江辰先被押入审判庭，林青禾随后带证人入场，执事最后亮出旧账册压人',
          cost_and_reward: '江辰暴露第二本账册的同时洗清罪名，得到禁地钥匙线索',
          ending_contract: {
            next_chapter_pull: '禁地钥匙对应第二扇门，门后有人等江辰',
          },
        },
      },
    }
    const flatButMentionedText = [
      '审判庭开场逼江辰按下认罪书血印，旧账册定罪，江辰被迫承压。',
      '林青禾拖住证人，账册细节互相矛盾，江辰直接用第二本账册当众反证。',
      '旧印章证明账目被调换，执事在众目睽睽下改口，旁观弟子都很震惊。',
      '江辰暴露第二本账册的同时洗清罪名，得到禁地钥匙线索。',
      '账册夹层露出禁地钥匙，禁地钥匙对应第二扇门，门后有人等江辰。',
    ].join('\n')

    const report = buildChapterBlueprintSyncReport(project, chapter, contextPackage, flatButMentionedText)

    expect(report.status).toBe('warn')
    expect(report.label).toContain('细纲缺口')
    expect(report.craft_checks.map((item: any) => item.key)).toEqual([
      'payoff_setup',
      'differentiated_reactions',
      'detail_balance',
    ])
    expect(report.craft_checks.filter((item: any) => item.status === 'warn').map((item: any) => item.label)).toContain('爽点铺垫')
    expect(report.craft_checks.filter((item: any) => item.status === 'warn').map((item: any) => item.label)).toContain('差异化反应')
    expect(report.craft_checks.filter((item: any) => item.status === 'warn').map((item: any) => item.label)).toContain('详略分配')
    expect(report.missed.map((item: any) => item.key)).toContain('craft_payoff_setup')
  })
  test('story state sync persists a chapter_blueprint_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBlueprintSync, reviewType: 'chapter_blueprint_sync'")
    expect(source).toContain('buildChapterBlueprintSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_blueprint_sync = chapterBlueprintSync')
  })
  test('checks final prose against benchmark recall brief after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 7, chapter_no: 7, title: '旧印章反推' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          style_profile_summary: '短句推进审讯压力，对白留半拍，动作句只保留能改变信息差的细节。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出', '旁观者差异化反应'],
          gaps: ['matched_deep_dive_missing', '文风摘要偏冷，情绪模块要求更强爽感释放'],
        },
      },
    }
    const deliveredText = [
      '执事第一轮压问旧账册从哪里来，李玄没有急着答。',
      '第二轮，他逼林青禾改口；第三轮，他把旁观弟子也压进证词里。',
      '李玄等他话音落尽，才晚半拍亮出旧印章。证据爆发的瞬间，执事脸色第一次失控。',
      '旁观弟子分成三拨：有人怀疑，有人倒戈，有人沉默退后。',
      '短暂冷却后，旧印章背面露出第二个证人的名字，章尾钩子压住没有解释。',
    ].join('\n')
    const weakText = [
      '李玄拿出旧印章，直接证明执事换证。',
      '所有旁观弟子都震惊了。',
      '执事很生气，事情进入下一阶段。',
    ].join('\n')

    const okReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('召回 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.gaps).toContain('matched_deep_dive_missing')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('召回缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('节奏参照')
    expect(warnReport.next_actions.join('；')).toContain('文风召回')
  })
})
