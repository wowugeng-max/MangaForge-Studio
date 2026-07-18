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

describe('readability meme polish', () => {
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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

  test('adds camelCase first30 retention brief from pre-draft context to prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        preDraftBrief: {
          first30RetentionBrief: {
            segmentLabel: '试读十章',
            flags: ['章末钩子弱'],
            requiredActions: ['前300字给危机', '章末留下门外学生悬念'],
            repairFocus: '补开篇钩子和章末追读',
          },
        },
        chapter_target: {
          id: 3,
          chapter_no: 3,
          title: '门外学生',
          summary: '门外学生带来新的阵法失控线索。',
          conflict: '主角必须判断救人还是守住阵图秘密。',
          ending_hook: '学生袖口露出失传阵纹。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('本章前30章留存修复')
    expect(prompt).toContain('前300字给危机')
    expect(prompt).toContain('章末留下门外学生悬念')
  })

  test('adds reader drop risk brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      reader_trial_context: {
        status: 'needs_repair',
        score: 66,
        quality_bar: '起点1万均订试读基准',
        drop_points: ['第7章中段解释阵法过密，试读用户可能弃读。', '章末钩子只交代结果，没有未解问题。'],
        pull_points: ['主角用残阵反压执事时有追读爽点。'],
        repair_actions: ['开篇 300 字先给阵图被夺的现场压力。', '中段减少设定解释，用动作验证阵法规则。', '章末留下第二层阵纹的代价问题。'],
      },
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
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(brief.reader_drop_risk_brief.status).toBe('needs_repair')
    expect(brief.reader_drop_risk_brief.quality_bar).toContain('起点1万均订')
    expect(brief.reader_drop_risk_brief.drop_points[0]).toContain('中段解释阵法过密')
    expect(brief.reader_drop_risk_brief.opening_guardrail).toContain('开篇 300 字')
    expect(brief.reader_drop_risk_brief.middle_guardrail).toContain('中段减少设定解释')
    expect(brief.reader_drop_risk_brief.ending_guardrail).toContain('章末留下第二层阵纹')
    expect(context.chapter_target.reader_drop_risk_brief.drop_points[0]).toContain('试读用户可能弃读')
    expect(prompt).toContain('【读者弃读预警】')
    expect(prompt).toContain('开篇 300 字')
    expect(prompt).toContain('中段减少设定解释')
    expect(prompt).toContain('章末留下第二层阵纹')
    expect(prompt).toContain('执行 chapter_target.reader_drop_risk_brief')
  })

  test('injects camelCase pre-draft reader drop risk brief into prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        preDraftBrief: {
          readerDropRiskBrief: {
            status: 'needs_repair',
            qualityBar: '起点1万均订试读基准',
            dropPoints: ['中段解释阵法过密，试读用户可能弃读。'],
            repairActions: ['中段减少设定解释，用动作验证阵法规则。'],
            openingGuardrail: '开篇 300 字先给阵图被夺的现场压力。',
            middleGuardrail: '中段减少设定解释，用动作验证阵法规则。',
            endingGuardrail: '章末留下第二层阵纹的代价问题。',
          },
        },
        chapter_target: {
          id: 7,
          chapter_no: 7,
          title: '夜闯阵堂',
          summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
          conflict: '守堂执事阻拦，主角必须证明阵图归属。',
          ending_hook: '阵图背面露出第二层阵纹。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )
    const dropRiskSection = prompt.slice(
      prompt.indexOf('【读者弃读预警】'),
      prompt.indexOf('【结构化上下文包】'),
    )

    expect(dropRiskSection).toContain('【读者弃读预警】')
    expect(dropRiskSection).toContain('中段解释阵法过密')
    expect(dropRiskSection).toContain('中段减少设定解释')
    expect(dropRiskSection).toContain('章末留下第二层阵纹')
  })

  test('adds golden-three launch guardrail for the first three chapters', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 1,
        chapter_no: 1,
        title: '残阵开局',
        summary: '主角在残阵事故中被迫证明自己没有偷阵图。',
        conflict: '执事当众栽赃，主角必须用残阵反证。',
        ending_hook: '阵图背面显出第二层阵纹。',
        scene_cards: [
          {
            title: '残阵事故',
            reader_payoff: '主角用残阵反证栽赃',
            conflict: '执事栽赃主角偷阵图',
            ending_hook_seed: '第二层阵纹显形',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 1, title: '残阵开局' },
    )

    expect(brief.golden_three_brief.version).toBe('oh_story_golden_three_v1')
    expect(brief.golden_three_brief.chapter_no).toBe(1)
    expect(brief.golden_three_brief.phase_label).toBe('第一章启动')
    expect(brief.golden_three_brief.opening_requirements.join('｜')).toContain('前 500 字有钩子')
    expect(brief.golden_three_brief.hard_requirements.join('｜')).toContain('主角第一章就出场')
    expect(brief.golden_three_brief.hard_requirements.join('｜')).toContain('第一章有事件')
    expect(brief.golden_three_brief.forbidden_patterns).toContain('大段世界观说明')
    expect(brief.golden_three_brief.payoff_target_count).toBe(2)
    expect(brief.golden_three_brief.current_chapter_payoffs.join('｜')).toContain('主角用残阵反证栽赃')
    expect(context.chapter_target.golden_three_brief.phase_label).toBe('第一章启动')
    expect(prompt).toContain('【黄金三章启动守门】')
    expect(prompt).toContain('执行 chapter_target.golden_three_brief')
    expect(prompt).toContain('前三章至少两个爽点')
    expect(prompt).toContain('不得用大段世界观说明开局')
  })

  test('adds story pressure ladder to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      story_pressure_ladder: {
        status: 'needs_attention',
        score: 64,
        chapterRangeLabel: '第7-12章',
        pressureSources: [
          { label: '执事压迫', count: 4, chapters: [7, 8, 9, 10], riskLevel: 'warn' },
        ],
        signals: [
          { key: 'pressure_source', label: '压力源', status: 'warn', detail: '未来章节压力源过于集中。' },
          { key: 'conflict_escalation', label: '冲突升级', status: 'ok', detail: '未来章节能看到压力加码。' },
          { key: 'stakes_growth', label: '赌注升级', status: 'warn', detail: '未来章节缺少可感知赌注。' },
          { key: 'reversal_pressure', label: '反转逼迫', status: 'warn', detail: '未来章节缺少两难选择。' },
        ],
        nextActions: ['下一批章节要明确压力源、升级赌注和反转逼迫。'],
      },
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
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(brief.story_pressure_brief.status).toBe('needs_attention')
    expect(brief.story_pressure_brief.pressure_sources[0]).toContain('执事压迫')
    expect(brief.story_pressure_brief.weak_signals.map((item: any) => item.key)).toContain('stakes_growth')
    expect(brief.story_pressure_brief.stakes_growth_guardrail).toContain('可感知赌注')
    expect(brief.story_pressure_brief.reversal_pressure_guardrail).toContain('两难选择')
    expect(context.chapter_target.story_pressure_brief.required_actions[0]).toContain('升级赌注')
    expect(prompt).toContain('【故事压力阶梯】')
    expect(prompt).toContain('执行 chapter_target.story_pressure_brief')
    expect(prompt).toContain('执事压迫')
    expect(prompt).toContain('赌注升级')
    expect(prompt).toContain('反转逼迫')
  })

  test('injects camelCase pre-draft story pressure brief into prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        preDraftBrief: {
          storyPressureBrief: {
            status: 'needs_attention',
            pressureSources: ['协会会长当众封锁账册'],
            stakesGrowthGuardrail: '如果失败，主角会失去试炼资格。',
            reversalPressureGuardrail: '必须逼主角在公开证据和保护证人之间二选一。',
            requiredActions: ['至少一个场景写出证人被反制后的新代价。'],
          },
        },
        chapter_target: {
          id: 7,
          chapter_no: 7,
          title: '夜闯阵堂',
          summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
          conflict: '守堂执事阻拦，主角必须证明阵图归属。',
          ending_hook: '阵图背面露出第二层阵纹。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )
    const pressureSection = prompt.slice(
      prompt.indexOf('【故事压力阶梯】'),
      prompt.indexOf('【主角能动性】'),
    )

    expect(pressureSection).toContain('【故事压力阶梯】')
    expect(pressureSection).toContain('协会会长当众封锁账册')
    expect(pressureSection).toContain('失去试炼资格')
    expect(pressureSection).toContain('保护证人')
    expect(pressureSection).toContain('证人被反制后的新代价')
  })

  test('adds protagonist agency story drive to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 12,
        chapter_no: 12,
        title: '试炼资格',
        chapter_goal: '主角拿到试炼资格',
        core_conflict: '执事设局阻拦主角参加试炼',
        protagonist_choice: '主角当众选择用残阵反证阵图归属',
        choice_cost: '暴露阵盘裂纹，招来内门势力注意',
        state_change: '主角从被动挨压转为主动入局',
        ending_hook: '内门长老盯上阵盘裂纹。',
        scene_cards: [
          {
            title: '阵堂对峙',
            conflict: '执事设局阻拦主角参加试炼',
            turning_point: '主角当众选择用残阵反证阵图归属',
            reader_payoff: '主角拿到试炼资格',
            exit_state: '主角从被动挨压转为主动入局',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 12, title: '试炼资格' },
    )

    expect(brief.story_drive_brief.protagonist_choice).toContain('当众选择')
    expect(brief.story_drive_brief.choice_cost).toContain('暴露阵盘裂纹')
    expect(brief.story_drive_brief.state_change).toContain('主动入局')
    expect(brief.story_drive_brief.obstacle).toContain('执事设局')
    expect(brief.story_drive_brief.causal_next_step).toContain('内门长老')
    expect(context.chapter_target.story_drive_brief.required_actions[0]).toContain('主角主动选择')
    expect(prompt).toContain('【主角能动性】')
    expect(prompt).toContain('执行 chapter_target.story_drive_brief')
    expect(prompt).toContain('主角选择')
    expect(prompt).toContain('选择代价')
    expect(prompt).toContain('状态变化')
  })

  test('adds serial rhythm payoff density to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', synopsis: '废柴阵师靠残阵翻盘。', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 15,
        chapter_no: 15,
        title: '阵堂打脸',
        summary: '主角在阵堂公开拆穿执事偷换阵图。',
        conflict: '执事拖延审查，主角必须当场逼出破绽。',
        ending_hook: '破阵声中，内门长老认出残阵来源。',
        word_target: { label: '标准章', target: 3200, min: 2800, max: 3500 },
        scene_cards: [
          {
            scene_no: 1,
            title: '堂前拦路',
            opening_hook: '执事把假阵图拍在主角脸前。',
            conflict: '执事当众污蔑主角偷阵。',
            reader_payoff: '主角用一句反问逼执事露怯。',
            reversal: '假阵图上的裂纹反而证明执事动过手脚。',
            ending_hook_seed: '众弟子开始怀疑执事。',
            word_budget: '1000 字',
          },
          {
            scene_no: 2,
            title: '残阵反证',
            conflict: '主角必须在阵纹崩毁前复原真图。',
            reader_payoff: '残阵亮起，执事的伪证当场反噬。',
            reversal: '内门长老发现残阵源自禁库。',
            ending_hook_seed: '长老问主角从哪里学来这道阵。',
            word_budget: '1800 字',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T09:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 15, title: '阵堂打脸' },
    )

    expect(brief.serial_rhythm_brief.opening_hook_deadline).toContain('前 300 字')
    expect(brief.serial_rhythm_brief.payoff_interval).toContain('800-1200')
    expect(brief.serial_rhythm_brief.scene_payoff_budget).toHaveLength(2)
    expect(brief.serial_rhythm_brief.scene_payoff_budget[0].required_payoff).toContain('逼执事露怯')
    expect(brief.serial_rhythm_brief.scene_payoff_budget[1].turn).toContain('禁库')
    expect(brief.serial_rhythm_brief.anti_drag_rules.join('；')).toContain('连续')
    expect(context.chapter_target.serial_rhythm_brief.scene_payoff_budget[1].title).toBe('残阵反证')
    expect(prompt).toContain('【连载节奏与回报密度】')
    expect(prompt).toContain('执行 chapter_target.serial_rhythm_brief')
    expect(prompt).toContain('每 800-1200 字')
    expect(prompt).toContain('残阵反证')
    expect(prompt).toContain('伪证当场反噬')
  })

  test('adds page-turn hook execution brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 16,
        chapter_no: 16,
        title: '禁库旧阵',
        summary: '主角用残阵反证执事伪造证据。',
        conflict: '执事试图把禁库旧阵嫁祸给主角。',
        ending_hook: '内门长老盯着亮起的残阵，问主角从哪里学来禁库旧阵。',
        story_drive_brief: {
          causal_next_step: '下一章必须追问禁库旧阵来源，并逼主角解释师承。',
        },
        scene_cards: [
          {
            scene_no: 2,
            title: '残阵亮名',
            reader_payoff: '执事伪证被残阵反噬。',
            reversal: '内门长老认出残阵源自禁库。',
            ending_hook_seed: '长老当众问出禁库旧阵来源。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T10:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 16, title: '禁库旧阵' },
    )

    expect(brief.page_turn_hook_brief.core_question).toContain('禁库旧阵')
    expect(brief.page_turn_hook_brief.visible_trigger).toContain('内门长老认出')
    expect(brief.page_turn_hook_brief.next_chapter_pull).toContain('追问禁库旧阵来源')
    expect(brief.page_turn_hook_brief.forbidden_resolution.join('；')).toContain('不得在本章解释完整答案')
    expect(context.chapter_target.page_turn_hook_brief.final_image).toContain('长老当众问出')
    expect(prompt).toContain('【章末翻页钩子】')
    expect(prompt).toContain('执行 chapter_target.page_turn_hook_brief')
    expect(prompt).toContain('最后 300 字')
    expect(prompt).toContain('内门长老认出残阵源自禁库')
    expect(prompt).toContain('不得在本章解释完整答案')
  })

  test('adds volume climax budget brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      volume_beat_budget: {
        status: 'needs_attention',
        score: 62,
        current_volume_title: '第一卷 阵堂起势',
        chapter_range: '第1-60章',
        summary: '当前卷缺中高潮和卷末爆点，本章承担第一次小高潮回报。',
        beats: [
          {
            chapter_no: 18,
            type: '小高潮',
            label: '阵堂公开打脸',
            detail: '主角公开反证执事偷换阵图。',
          },
          {
            chapter_no: 45,
            type: '卷末爆点',
            label: '禁库真相',
            detail: '禁库旧阵牵出主角师承真相。',
          },
        ],
        next_actions: ['本章只兑现阵堂公开打脸，不提前揭穿禁库真相。'],
      },
      chapter_target: {
        id: 18,
        chapter_no: 18,
        title: '阵堂公开打脸',
        summary: '主角在阵堂公开反证执事偷换阵图。',
        conflict: '执事逼主角认罪，主角必须反证阵图来源。',
        ending_hook: '禁库旧阵的第二层纹路亮起。',
        volume_beat_brief: {
          current_chapter_role: '完成第一卷第一次小高潮：阵堂公开打脸。',
          volume_goal: '让主角在阵堂立住起势资格。',
          climax_promise: '公开反证执事偷换阵图，给读者阶段性打脸回报。',
          required_beats: ['执事当众失势', '主角得到试炼资格'],
          forbidden_payoff: ['不得提前揭穿禁库真相', '不得提前解决卷末师承身份'],
        },
        scene_cards: [
          {
            title: '阵堂对证',
            conflict: '执事逼主角认罪。',
            reader_payoff: '主角公开反证执事偷换阵图。',
            reversal: '执事伪证被残阵反噬。',
            ending_hook_seed: '禁库旧阵第二层纹路亮起。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T11:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 18, title: '阵堂公开打脸' },
    )

    expect(brief.volume_climax_brief.current_chapter_role).toContain('第一次小高潮')
    expect(brief.volume_climax_brief.volume_goal).toContain('起势资格')
    expect(brief.volume_climax_brief.climax_promise).toContain('阶段性打脸回报')
    expect(brief.volume_climax_brief.required_beats).toContain('执事当众失势')
    expect(brief.volume_climax_brief.forbidden_payoff).toContain('不得提前揭穿禁库真相')
    expect(brief.volume_climax_brief.nearby_beats[0].label).toContain('阵堂公开打脸')
    expect(context.chapter_target.volume_climax_brief.forbidden_payoff[1]).toContain('师承身份')
    expect(prompt).toContain('【卷级高潮预算】')
    expect(prompt).toContain('执行 chapter_target.volume_climax_brief')
    expect(prompt).toContain('第一次小高潮')
    expect(prompt).toContain('不得提前揭穿禁库真相')
  })

  test('adds recent fatigue avoidance brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      recent_fatigue_radar: {
        status: 'needs_attention',
        score: 61,
        chapter_range_label: '第9-18章',
        summary: '近10章存在 3 类同质化风险：冲突变化、回报变化、钩子变化。',
        signals: [
          { key: 'conflict_variety', label: '冲突变化', status: 'warn', detail: '近10章「执事压迫」出现 7 次，冲突来源变化不足。' },
          { key: 'payoff_variety', label: '回报变化', status: 'warn', detail: '近10章「公开打脸」出现 6 次，回报形态变化不足。' },
          { key: 'hook_variety', label: '钩子变化', status: 'warn', detail: '近10章「试炼将至」出现 6 次，章末问题变化不足。' },
          { key: 'scene_freshness', label: '场面新鲜度', status: 'warn', detail: '近10章缺少稳定的标志性场面记录。' },
        ],
        next_actions: ['下一章要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
      },
      chapter_target: {
        id: 19,
        chapter_no: 19,
        title: '旧阵异响',
        summary: '主角发现旧阵异响来自藏书阁而非阵堂。',
        conflict: '旧执事余党仍想用阵堂规矩压人，主角转向藏书阁追查。',
        ending_hook: '藏书阁地砖下传出第二道阵鸣。',
        scene_cards: [
          {
            title: '藏书阁转场',
            conflict: '旧执事余党继续用阵堂规矩压人。',
            reader_payoff: '主角不再重复公开打脸，而是用旧阵异响反向设局。',
            ending_hook_seed: '藏书阁地砖下传出第二道阵鸣。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T12:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 19, title: '旧阵异响' },
    )

    expect(brief.recent_fatigue_brief.chapter_range_label).toContain('第9-18章')
    expect(brief.recent_fatigue_brief.fatigue_risks.join('；')).toContain('执事压迫')
    expect(brief.recent_fatigue_brief.conflict_variation).toContain('更换压迫来源')
    expect(brief.recent_fatigue_brief.payoff_variation).toContain('更换回报形态')
    expect(brief.recent_fatigue_brief.hook_variation).toContain('更换章末问题')
    expect(brief.recent_fatigue_brief.scene_freshness).toContain('可视化场面')
    expect(context.chapter_target.recent_fatigue_brief.next_actions[0]).toContain('十章连续同质化')
    expect(prompt).toContain('【近章连载动能与疲劳规避】')
    expect(prompt).toContain('执行 chapter_target.recent_fatigue_brief')
    expect(prompt).toContain('逐条执行 next_actions')
    expect(prompt).toContain('执事压迫')
    expect(prompt).toContain('更换压迫来源')
  })

})
