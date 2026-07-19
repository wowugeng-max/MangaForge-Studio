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

describe('readability meme polish a', () => {
  test('flags copied benchmark anchor excerpts after delivery', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 18, chapter_no: 18, title: '雨夜反证' }
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          anchor_excerpts: [
            '雨声贴着瓦檐往下压。掌柜没有立刻辩解，只把账册翻到缺页前一行，让所有人先看见那枚旧印。',
          ],
        },
      },
    }
    const copiedText = [
      '执事第一轮压问旧账从哪里来，李玄没有立刻答。',
      '雨声贴着瓦檐往下压。掌柜没有立刻辩解，只把账册翻到缺页前一行，让所有人先看见那枚旧印。',
      '他才把缺页和旧印推到灯下，旁观弟子当场倒戈。',
    ].join('\n')

    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, copiedText)

    expect(report.status).toBe('warn')
    expect(report.missed.map((item: any) => item.key)).toContain('benchmark_anchor_excerpt_copy_risk')
    expect(report.missed.find((item: any) => item.key === 'benchmark_anchor_excerpt_copy_risk')?.label).toBe('原文锚点复制风险')
    expect(report.copied_anchor_excerpts.join('｜')).toContain('账册翻到缺页前一行')
    expect(report.next_actions.join('；')).toContain('锚点原句')
  })

  test('keeps benchmark recall sync open when primary module or rhythm contract is missing', () => {
    const report = buildBenchmarkRecallSyncReport(
      { title: '残阵问道', reference_config: {} },
      { id: 8, chapter_no: 8, title: '召回缺契约' },
      {
        chapter_target: {
          benchmark_recall_brief: {
            gaps: ['missing_primary_contract', 'module_missing', 'rhythm_missing'],
            repair_action: '重跑 /story-long-analyze Stage 3+ 或重新 /story-import。',
          },
        },
      },
      '李玄简单说明旧账有问题，众人听完后继续审讯。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toContain('召回缺口')
    expect(report.missed_count).toBeGreaterThan(0)
    expect(report.missed.map((item: any) => item.key)).toContain('benchmark_missing_primary_contract')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('missing_primary_contract')
    expect(report.next_actions.join('；')).toContain('重跑')
  })

  test('checks benchmark authority rules after delivery when style conflicts with module rhythm', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 18, chapter_no: 18, title: '雨夜反证' }
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀：压迫后必须强爽感释放。',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子。',
          style_profile_summary: '文风摘要建议冷静旁观，低情绪慢铺陈。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          gaps: ['module_rhythm_conflict', '文风摘要偏冷，情绪模块要求更强爽感释放'],
          authority_rules: [
            '发生冲突时 selected_emotion_module 与 rhythm_reference 是权威；style_profile_summary 只管表达，不得压低情绪爆发。',
          ],
        },
      },
    }
    const deliveredText = [
      '执事第一轮压问旧账册从哪里来，李玄没有答。',
      '第二轮，他逼林青禾改口；第三轮，他把旁观弟子也压进证词里。',
      '李玄晚半拍亮出旧印章，旧账缺页和袖口暗纹对上的瞬间，执事脸色失控。',
      '旁观弟子有人倒戈，有人沉默退后，雨声短暂压住审讯厅。',
      '冷却后，旧账背面露出内门印记，章尾钩子没有解释。',
    ].join('\n')
    const weakText = [
      '雨夜很安静。',
      '李玄冷静地把旧账册放在桌上。',
      '众人看完证据，意识到执事可能有问题。',
      '他没有多说，审讯继续。',
    ].join('\n')

    const okReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.missed.map((item: any) => item.key)).not.toContain('benchmark_authority_rule')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('benchmark_authority_rule')
    expect(warnReport.missed.find((item: any) => item.key === 'benchmark_authority_rule')?.label).toBe('召回权威规则')
    expect(warnReport.next_actions.join('；')).toContain('权威')
    expect(warnReport.next_actions.join('；')).toContain('文风只管表达')
  })

  test('checks benchmark canonical source authority after delivery when style-only prose ignores module rhythm', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 19, chapter_no: 19, title: '雨夜复审' }
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀：压三轮后证据爆发。',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却。',
          style_profile_summary: '冷静克制，短句留白。',
          source_paths: [
            '对标/旧城诡案/剧情/情绪模块.md',
            '对标/旧城诡案/剧情/节奏.md',
            '对标/旧城诡案/文风.md',
          ],
          gaps: ['module_rhythm_conflict: 文风摘要偏冷，情绪模块要求强爽感释放'],
        },
      },
    }
    const deliveredText = [
      '执事第一轮压问账册来源，李玄只把旧印压在纸角。',
      '第二轮逼问证人，第三轮逼问归属判定，审讯厅的声音一层层压低。',
      '他到最后才亮出缺页和暗纹，证据爆发时，执事当场改口。',
      '旁观弟子有人倒戈，有人沉默，短暂冷却后，旧印背面浮出第二个名字。',
    ].join('\n')
    const styleOnlyText = [
      '雨夜很静。',
      '李玄冷静克制地翻过旧账，短句留白，没有解释。',
      '众人看完证据后都安静下来，审讯继续向后推进。',
    ].join('\n')

    const okReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, styleOnlyText)

    expect(okReport.missed.map((item: any) => item.key)).not.toContain('benchmark_canonical_source_rule')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('benchmark_canonical_source_rule')
    expect(warnReport.missed.find((item: any) => item.key === 'benchmark_canonical_source_rule')?.label).toBe('召回来源权威')
    expect(warnReport.next_actions.join('；')).toContain('来源权威')
    expect(warnReport.next_actions.join('；')).toContain('情绪模块/节奏参照优先')
  })

  test('derives benchmark recall sync from mixed-case pre-draft style sample strategy', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 19, chapter_no: 19, title: '雨夜复审' }
    const contextPackage = {
      pre_draft_brief: {
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '先压三轮，再半拍亮证据，爆发后短冷却',
          styleProfileSummary: '短句推进审讯压力，动作句只保留信息差变化。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
        },
      },
      chapter_target: {
        chapter_no: 19,
        title: '雨夜复审',
      },
    }
    const weakText = [
      '雨夜里，李玄把账册放在桌上。',
      '众人看完以后，觉得执事大概有问题。',
      '审讯继续，事情暂时没有结果。',
    ].join('\n')

    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, weakText)

    expect(report.label).toContain('召回缺口')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪模块', '节奏参照', '文风摘要', '匹配章技法']))
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('先压三轮')
    expect(report.next_actions.join('；')).toContain('文风召回')
  })

  test('derives benchmark recall sync from camelCase preDraftBrief style sample strategy', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 20, chapter_no: 20, title: '旧账复核' }
    const contextPackage = {
      preDraftBrief: {
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮出旧账缺页',
          styleProfileSummary: '对白短促，动作句只服务证据反转。',
          matchedChapterTechniques: ['旧账缺页反证', '旁观者分层反应'],
        },
      },
      chapter_target: {
        chapter_no: 20,
        title: '旧账复核',
      },
    }
    const weakText = '李玄简单说明旧账有问题，众人听完后继续审讯。'

    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, weakText)

    expect(report.label).toContain('召回缺口')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪模块', '节奏参照', '匹配章技法']))
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('旧账缺页')
  })

  test('keeps camelCase preDraftBrief recall source when snake pre-draft brief is empty', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 21, chapter_no: 21, title: '空档复审' }
    const contextPackage = {
      pre_draft_brief: {},
      preDraftBrief: {
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '两轮逼问后用空白账页反证',
          matchedChapterTechniques: ['空白账页反证'],
        },
      },
      chapter_target: {
        chapter_no: 21,
        title: '空档复审',
      },
    }
    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, '李玄看了一眼账页，没有继续追问。')

    expect(report.label).toContain('召回缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页反证')
  })

  test('reads runtime camelCase chapterTarget benchmarkRecallBrief after delivery', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 22, chapter_no: 22, title: '旧账复审' }
    const contextPackage = {
      chapterTarget: {
        chapterNo: 22,
        title: '旧账复审',
        benchmarkRecallBrief: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '两轮逼问后用空白账页反证',
          styleProfileSummary: '对白短促，动作句只服务证据反转。',
          matchedChapterTechniques: ['空白账页反证', '旁观者分层反应'],
        },
      },
    }

    const report = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, '李玄简单说明旧账有问题，众人听完后继续审讯。')

    expect(report.label).toContain('召回缺口')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪模块', '节奏参照', '匹配章技法']))
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('空白账页反证')
  })

  test('story state sync persists a benchmark_recall_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: benchmarkRecallSync, reviewType: 'benchmark_recall_sync'")
    expect(source).toContain('buildBenchmarkRecallSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.benchmark_recall_sync = benchmarkRecallSync')
  })

  test('checks final prose against style boundary contract after delivery', () => {
    const project = { title: '残阵问道', reference_config: {} }
    const chapter = { id: 7, chapter_no: 7, title: '旧印章反推' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        style_boundary_contract: {
          version: 'oh_story_style_boundary_v1',
          hard_constraints: [
            '禁用词 / banned_words 永远优先。',
            'Gate F 章末禁升华永远优先。',
            '禁止万能比喻、命运感套话、作者预告。',
          ],
          copy_boundary_rules: [
            '不得复制样章桥段、专有设定、角色名、核心梗、原句、口癖和独特比喻。',
            '只学习抽象技法。',
          ],
          quality_checks: ['硬约束永远赢。'],
        },
      },
    }
    const okText = [
      '执事压住账册，李玄没有照搬样章的敲桌节奏，只把旧印章推到裂纹旁。',
      '旁观弟子先沉默，再有人倒戈。',
      '最后，旧印章背面露出第二个证人的名字。',
    ].join('\n')
    const weakText = [
      '执事三次敲桌，冷冷说出样章里那句口癖。',
      '李玄心想，这一切只是开始，更大的风暴即将来临。',
      '命运像一张无形的大网笼罩下来。',
    ].join('\n')

    const okReport = buildStyleBoundarySyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildStyleBoundarySyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('文风边界 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('文风边界缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['Gate F 章末升华', '作者预告', '万能比喻', '样章复制风险']))
    expect(warnReport.next_actions.join('；')).toContain('硬约束永远赢')
  })

  test('reads style boundary sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = {
      id: 24,
      chapter_no: 24,
      title: '边界复核',
      raw_payload: {
        preDraftBrief: {
          styleBoundaryContract: {
            hardConstraints: ['硬约束永远赢', 'Gate F 章末禁升华'],
            copyBoundaryRules: ['不得复制样章桥段'],
            qualityChecks: ['必须检查文风是否覆盖硬约束。'],
          },
        },
      },
    }
    const report = buildStyleBoundarySyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 24, title: '边界复核' } },
      '李玄心想，这一切只是开始，更大的风暴即将来临。',
    )

    expect(report.label).toContain('文风边界缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('硬约束永远赢')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['Gate F 章末升华', '作者预告']))
  })

  test('reads runtime camelCase chapterTarget styleBoundaryContract after delivery', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 25, chapter_no: 25, title: '边界复核' }
    const report = buildStyleBoundarySyncReport(
      project,
      chapter,
      {
        chapterTarget: {
          chapterNo: 25,
          title: '边界复核',
          styleBoundaryContract: {
            hardConstraints: ['硬约束永远赢', 'Gate F 章末禁升华'],
            copyBoundaryRules: ['不得复制样章桥段'],
            qualityChecks: ['必须检查文风是否覆盖硬约束。'],
          },
        },
      },
      '李玄心想，这一切只是开始，更大的风暴即将来临。',
    )

    expect(report.label).toContain('文风边界缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('硬约束永远赢')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['Gate F 章末升华', '作者预告']))
  })

  test('story state sync persists a style_boundary_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleBoundarySync, reviewType: 'style_boundary_sync'")
    expect(source).toContain('buildStyleBoundarySyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.style_boundary_sync = styleBoundarySync')
  })

  test('checks final prose against style sample strategy after delivery', () => {
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const chapter = { id: 2, chapter_no: 2, title: '第一条规则' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        style_sample_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '规则危机反打',
              scene_function: '规则压力下的动作反制',
              narrative_rhythm: '先压迫，再拆规则，再小反打',
              sentence_pattern: '短中句为主，解释压短',
              dialogue_ratio: '35%-45%',
              voice_rules: ['李超高压后半拍吐槽', '张智冷静拆规则'],
              abstract_usage: '动作链和规则判定交替推进',
              unsafe_direct_phrases: ['这破学校连晚自习都外包给影子了'],
            },
          ],
        },
      },
    }
    const deliveredText = [
      '十点整，门外黑影压上玻璃。李超抬拳，脚尖刚过线就被无形力量顶回。',
      '“这规则还挺会加班。”李超咬牙，把手收了回来。',
      '张智蹲下，用饼干碎屑试探门槛：“别硬闯。它判定的是越界，不是力量。”',
      '碎屑刚飞出去，就被黑影清除。压迫、拆规则、小反打在同一场景里完成。',
      '李超盯着灰白门槛线：“懂了，先让它露判定，再揍能揍的东西。”',
    ].join('\n')
    const weakText = '宿舍里很安静，大家围坐在一起。张智解释了很多规则来源和可能性，李超认真听完，没有插话，也没有尝试动作验证。'

    const okReport = buildStyleSampleSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildStyleSampleSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('风格 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('风格缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('对白比例')
    expect(warnReport.next_actions.join('；')).toContain('风格样章')
  })

  test('reads style sample sync strategy from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = {
      id: 22,
      chapter_no: 22,
      title: '雨巷复审',
      raw_payload: {
        preDraftBrief: {
          styleSampleStrategy: {
            enabled: true,
            samples: [
              {
                sample_key: '雨巷审讯样章',
                narrative_rhythm: '三轮压问后半拍亮证据',
                sentence_pattern: '短中句推进，解释压短',
                dialogue_ratio: '35%-45%',
              },
            ],
            doNotCopy: ['雨巷样章原句不能照搬'],
          },
        },
      },
    }
    const report = buildStyleSampleSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 22, title: '雨巷复审' } },
      '李玄看了一眼账册，说事情可能有问题。众人沉默，审讯继续。',
    )

    expect(report.label).toContain('风格缺口')
    expect(report.planned.map((item: any) => item.sample_key)).toContain('雨巷审讯样章')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('三轮压问')
  })

  test('reads runtime camelCase chapterTarget styleSampleStrategy after delivery', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 23, chapter_no: 23, title: '雨巷复审' }
    const contextPackage = {
      chapterTarget: {
        chapterNo: 23,
        title: '雨巷复审',
        styleSampleStrategy: {
          enabled: true,
          samples: [
            {
              sample_key: '雨巷审讯样章',
              narrative_rhythm: '三轮压问后半拍亮证据',
              sentence_pattern: '短中句推进，解释压短',
              dialogue_ratio: '35%-45%',
            },
          ],
          doNotCopy: ['雨巷样章原句不能照搬'],
        },
      },
    }

    const report = buildStyleSampleSyncReport(
      project,
      chapter,
      contextPackage,
      '李玄看了一眼账册，说事情可能有问题。众人沉默，审讯继续。',
    )

    expect(report.label).toContain('风格缺口')
    expect(report.planned.map((item: any) => item.sample_key)).toContain('雨巷审讯样章')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('三轮压问')
  })

  test('warns when prose drifts into comma-stutter fragments against the style fingerprint', () => {
    const project = { title: '旧城维修师', reference_config: {} }
    const chapter = { id: 24, chapter_no: 24, title: '雨巷复审' }
    const contextPackage = {
      story_state: {
        style_fingerprint: '文风指纹：目标句长带 18-36 字，允许半拍停顿，但整体保持中长句呼吸。',
      },
      chapter_target: {
        chapter_no: 24,
        style_sample_strategy: {
          enabled: true,
          style_profile_summary: '不要模仿可能已漂移的上一章碎句节奏，按文风指纹恢复中长句呼吸。',
        },
      },
    }
    const stutterText = [
      '雨停了，灯暗了，门开了，人来了。',
      '李玄看见，执事沉默，众人退后，旧账翻开。',
      '他抬手，停住，低声，说了一句。',
      '风声很碎，脚步很急，审讯继续。',
    ].join('\n')

    const report = buildStyleSampleSyncReport(project, chapter, contextPackage, stutterText)

    expect(report.status).toBe('warn')
    expect(report.planned.map((item: any) => item.label)).toContain('文风指纹句长带')
    expect(report.missed.map((item: any) => item.key)).toContain('style_drift_sentence_fingerprint')
    expect(report.missed.find((item: any) => item.key === 'style_drift_sentence_fingerprint')?.fix).toContain('不要模仿可能已漂移的上一章句式节奏')
    expect(report.next_actions.join('；')).toContain('文风指纹')
  })

  test('warns when style sample direct phrases are copied into prose', () => {
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const chapter = { id: 2, chapter_no: 2, title: '第一条规则' }
    const contextPackage = {
      chapter_target: {
        style_sample_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '规则怪谈高压吐槽',
              scene_function: '高压后半拍吐槽',
              unsafe_direct_phrases: ['这破学校连晚自习都外包给影子了'],
            },
          ],
        },
      },
    }

    const report = buildStyleSampleSyncReport(
      project,
      chapter,
      contextPackage,
      '李超盯着门外黑影，脱口而出：“这破学校连晚自习都外包给影子了。”',
    )

    expect(report.status).toBe('warn')
    expect(report.copy_risk_count).toBe(1)
    expect(report.copied_phrases[0]).toContain('这破学校')
    expect(report.next_actions.join('；')).toContain('不得照搬样章原句')
  })

  test('story state sync persists a style_sample_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("reviewType: 'style_sample_sync'")
    expect(source).toContain('buildStyleSampleSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.style_sample_sync = styleSampleSync')
  })

  test('adds first30 retention repair focus to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const review = {
      review_type: 'first30_retention_diagnosis',
      created_at: '2026-06-03T10:00:00.000Z',
      payload: JSON.stringify({
        report: {
          score: 76,
          status: 'needs_repair',
          positioning: { promise_ready: true, reader_promise: '寒门少年靠阵法反压宗门秩序。' },
          segments: [
            { key: '4-10', label: '试读十章', score: 68, coverage: 100, hook_rate: 57, payoff_average: 1.4, chapter_count: 7 },
          ],
          chapter_cards: [
            { chapter_id: 7, chapter_no: 7, title: '夜闯阵堂', score: 61, word_count: 2600, flags: ['章末钩子弱', '爽点/悬念信号少'] },
          ],
          risks: [
            { severity: 'high', segment: '4-10', issue: '章末追读钩子覆盖率偏低。', action: '补未解决问题。' },
          ],
        },
      }),
    }
    const first30Context = buildFirst30RetentionContext({ id: 7, chapter_no: 7, title: '夜闯阵堂' }, [review])
    const contextPackage = {
      first30_retention_context: first30Context,
      chapter_target: {
        id: 7,
        chapter_no: 7,
        title: '夜闯阵堂',
        summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
        conflict: '守堂执事阻拦，主角必须证明阵图归属。',
        ending_hook: '阵图背面露出第二层阵纹。',
        scene_cards: [
          { title: '阵堂对峙', reader_payoff: '主角用残阵反压守堂执事', conflict: '阵图归属争夺', ending_hook_seed: '第二层阵纹显形' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          first30_retention_brief: brief.first30_retention_brief,
        },
      },
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(first30Context?.chapter_score).toBe(61)
    expect(brief.first30_retention_brief.segment_label).toBe('试读十章')
    expect(brief.first30_retention_brief.flags).toContain('章末钩子弱')
    expect(brief.first30_retention_brief.required_actions).toContain('补未解决问题。')
    expect(prompt).toContain('本章前30章留存修复')
    expect(prompt).toContain('章末钩子弱')
    expect(prompt).toContain('补未解决问题')
  })

})
