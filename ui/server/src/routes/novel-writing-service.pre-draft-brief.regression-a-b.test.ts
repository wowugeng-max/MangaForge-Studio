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

describe('chapter pre-draft brief regression a b', () => {
  test('adds next batch serial brief to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapterRangeLabel: '第8-10章',
          batchGoal: '三章内进入内门视野。',
          readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
          mainlineFocus: '外门危机 -> 内门招揽',
          forbiddenBoundary: '第10章前不得揭露规则源头。',
          startChecklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
            { key: 'forbidden_boundary', label: '禁写边界', status: 'ok', detail: '第10章前不得揭露规则源头。' },
          ],
          chapters: [
            { chapterNo: 8, title: '外门夜钟', chapterTask: '证明夜钟规则有效。', conflict: '是否相信敌人提示。', endingHook: '钟声倒数。' },
            { chapterNo: 9, title: '反制试探', chapterTask: '用超人速度验证边界。', conflict: '速度能否绕过规则。', endingHook: '内门令牌出现。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
      },
    )

    expect(brief.next_batch_brief.chapter_range_label).toBe('第8-10章')
    expect(brief.next_batch_brief.batch_goal).toContain('内门视野')
    expect(brief.next_batch_brief.reader_payoff_plan).toContain('打脸')
    expect(brief.next_batch_brief.current_chapter_role).toContain('证明夜钟规则有效')
    expect(brief.next_batch_brief.forbidden_boundary).toContain('规则源头')
    expect(brief.next_batch_brief.start_checklist.map((item: any) => item.key)).toEqual(['core_promise', 'forbidden_boundary'])
    expect(brief.next_batch_brief.start_checklist[0].detail).toContain('规则反制')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('继续/续写/日更只表示继续当前日更批量流程')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('确定本轮写作范围后直接进入 Step 2')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('story-explorer')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('context_load')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('返回不完整')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('回退到手动加载')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/上下文.md 缺失时从 追踪/伏笔.md + 追踪/时间线.md 重建')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/伏笔.md 缺失可跳过')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/时间线.md 缺失可从正文推断')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('大纲/细纲_第{N}章.md 缺失必须先补建')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('确定下一章编号 N')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/上下文.md 的“最后完成章节”')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('扫描 正文/ 目录中编号最大的章节 +1')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('K 默认 2-3 章')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('只写1章')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('从细纲中提取本章涉及的角色名')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按需加载 设定/角色/{角色名}.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('细纲未列出角色时跳过')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Step 2.1 标题预检')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('同名或明显重复')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按本章核心事件改名')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('同步细纲标题与正文文件名')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得跳过 Step 2.2 状态筛选或 Step 2.3 文风召回')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('必须串行逐章写作，不得并发生成多章')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('章间不重复询问是否继续')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('细纲缺失')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('用户要求改变大纲/追踪')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('细纲缺失补建流程')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('设定/角色/{角色名}.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按新版细纲模板补齐内容概括、情节安排、人物关系/出场顺序、情节细化、结尾设定')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('无法确认字段写 [待补充]')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不杜撰')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('每章写完立即更新')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/上下文.md 只更新进度元信息')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不写详细角色状态/伏笔内容')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('超过30章时')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('已写内容摘要按三层结构')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('压缩早期章节、保留近期细节')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('近5章详记、十章概要、卷级总览')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('每50章或卷结束')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/归档')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('活跃伏笔、时间线、角色状态仍以当前文件为准')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('批量写作模式跳过单章 story-review lean')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('全部写完后再统一执行 Phase 5 质量检查')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Phase 5 完整检查清单')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('禁用词扫描、标题去重检查、正文元信息扫描和章尾钩子检查')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('命中时必须回对应正文或细纲修复')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Phase 5 对照细纲核对')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('新版细纲核对内容概括五段式、情节安排多线、人物关系变化/出场顺序、代价兑现/收益兑现')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('旧版细纲只核对核心事件、目标情绪、章首/章尾钩子和字数目标')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('伏笔盘点仅本轮增量')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('本批新增/推进/回收的伏笔已写入追踪/伏笔.md并更新状态')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('确定性收尾')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('主会话在本批实际落盘正文上运行 normalize-punctuation.js')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('check-ai-patterns.js --check')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('narrative-writer agent 不运行这些脚本')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('本轮 workflow 内实际读取或刚更新')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得用未标明来源的聊天记忆替代')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('首次日更兜底')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪文件全部为空或不存在')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('大纲/卷纲_当前卷.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('最新一章正文')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('重建上下文')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('新版细纲优先读取内容概括、情节安排、人物关系和出场顺序')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('旧版细纲缺这些字段不阻塞')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('回退到核心事件、目标情绪、章首/章尾钩子和字数目标')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('新版细纲进入意图确认时')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('内容概括决定起承转合')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('人物关系和出场顺序决定镜头进入顺序')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('情节细化决定代价兑现/收益兑现')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Step 2.4 craft')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Step 2.3 对标召回')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('剧情/情绪模块.md、剧情/节奏.md、文风.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('情绪模块/节奏参照优先')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('文风.md 只管表达层')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('对标缺口分流')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('missing_primary_contract/profile_missing')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得进入 narrative-writer')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('legacy_deconstruction')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('module_missing/rhythm_missing')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('matched_deep_dive_missing')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得在后续报告中反转为 false')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('无 story-explorer 时降级')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('手动按对标书路径查找')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('先读 剧情/情绪模块.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('grep 章节/*_摘要.md 的「基调」')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('第1-3章_深度拆解.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('v12 停止修复，legacy 才回退继续')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('资料研究按需')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('story-researcher')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('参考资料/')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('研究完成后再继续写作')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得编造确定事实')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('字数验证')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('优先 Python 字符统计')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('wc -m 仅作 Unix 备选')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('低于目标 90%')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('强制扩充')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('gaps/conflict 必须进入意图确认')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得用文风接近掩盖模块或节奏缺失')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('爽点出手前先铺可指认的危机/期待')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不铺=空洞')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('在场配角放大成差异化反应')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('信息型配角不当科普嘴')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按需加载创作公式')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('references/genre-writing-formulas.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('期待感公式、爽点公式、信息差公式')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('默认不加载')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('避免无条件加载 1500+ 行文件')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('批次最终进度摘要')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('## 写作进度')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('最后完成章节')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('本期完成')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('## 当前状态')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('下一章细纲状态')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('注意事项')
  })

  test('merges runtime chapterTarget next batch brief into the pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 8,
          nextBatchBrief: {
            chapterRangeLabel: '第8-10章',
            batchGoal: '运行时要求三章内完成外门到内门视野切换。',
            forbiddenBoundary: '第10章前不得揭露规则源头。',
            startChecklist: [
              { key: 'reader_payoff', label: '读者回报', status: 'ok', detail: '每章都要有规则反制爽点。' },
            ],
            chapters: [
              { chapterNo: 8, title: '外门夜钟', chapterTask: '本章只验证夜钟规则第一次显形。' },
            ],
          },
        },
      },
    )

    expect(brief.next_batch_brief.batch_goal).toContain('运行时要求三章内完成')
    expect(brief.next_batch_brief.current_chapter_role).toContain('本章只验证夜钟规则第一次显形')
    expect(brief.next_batch_brief.start_checklist[0].detail).toContain('规则反制爽点')
  })

  test('carries camelCase next batch brief through pre-draft brief confirmation', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        nextBatchBrief: {
          chapterRangeLabel: '第8-10章',
          batchGoal: '三章内进入内门视野。',
          readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
          mainlineFocus: '外门危机 -> 内门招揽',
          forbiddenBoundary: '第10章前不得揭露规则源头。',
          startChecklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
          ],
          chapters: [
            { chapterNo: 8, title: '外门夜钟', chapterTask: '证明夜钟规则有效。', conflict: '是否相信敌人提示。', endingHook: '钟声倒数。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
      },
    )
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        ...brief,
        confirmed_at: '2026-06-10T08:00:00.000Z',
      },
    )

    expect(brief.next_batch_brief.chapter_range_label).toBe('第8-10章')
    expect(brief.next_batch_brief.current_chapter_role).toContain('证明夜钟规则有效')
    expect(context.chapter_target.next_batch_brief.batch_goal).toContain('内门视野')
    expect(context.next_batch_brief.start_checklist[0].detail).toContain('规则反制')
  })

  test('adds longform memory capsule to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '万古长夜' },
      {
        longform_memory_capsule: {
          last_updated_chapter: 7,
          core_promise: '寒门少年以阵法改写宗门秩序。',
          mainline_progress: '外门压迫线推进到试炼前夜。',
          character_states: ['李玄：仍在藏拙，但已经被执事逼到试炼边缘'],
          open_questions: ['残阵缺口为什么会回应旧案禁制'],
          payoff_debts: ['试炼资格被夺后的公开打脸回报'],
          canon_facts: ['残阵缺口不能被普通阵图修复'],
          red_lines: ['主角不能脱离阵法成长线'],
        },
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          scene_cards: [],
        },
      },
    )

    expect(brief.longform_memory_capsule.core_promise).toContain('寒门少年')
    expect(brief.longform_memory_capsule.mainline_progress).toContain('试炼前夜')
    expect(brief.longform_memory_capsule.character_states[0]).toContain('李玄')
    expect(brief.longform_memory_capsule.open_questions).toContain('残阵缺口为什么会回应旧案禁制')
    expect(brief.longform_memory_capsule.payoff_debts).toContain('试炼资格被夺后的公开打脸回报')
    expect(brief.longform_memory_capsule.red_lines).toContain('主角不能脱离阵法成长线')
  })

  test('normalizes camelCase longform memory capsule item states in pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '万古长夜' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          scene_cards: [],
          longformMemoryCapsule: {
            corePromise: '寒门少年以阵法改写宗门秩序。',
            characterStates: [
              { name: '李玄', currentState: '右手阵纹失控，仍被迫藏拙', lastUpdatedChapter: 7 },
            ],
            openQuestions: [
              { name: '旧案禁制', currentState: '残阵缺口为什么会回应旧案禁制', lastUpdatedChapter: 7 },
            ],
            redLines: ['主角不能脱离阵法成长线'],
          },
        },
      },
    )

    expect(brief.longform_memory_capsule.core_promise).toContain('寒门少年')
    expect(brief.longform_memory_capsule.character_states).toContain('李玄：右手阵纹失控，仍被迫藏拙@第7章')
    expect(brief.longform_memory_capsule.open_questions).toContain('旧案禁制：残阵缺口为什么会回应旧案禁制@第7章')
  })

  test('adds oh-story layered memory context to the pre-draft brief and prose prompt', () => {
    const project = { title: '万古长夜', reference_config: {} }
    const contextPackage = {
      layered_memory_context: {
        recent_chapter_details: [
          { chapter_no: 46, summary: '李玄进入旧阵塔，发现残阵会吞掉灵识。', state_changes: ['右手阵纹失控'], foreshadowing: ['旧塔第七层有人影'] },
          { chapter_no: 47, summary: '林青禾有限作证，李玄拿到半枚旧印纹。', state_changes: ['互信仍有边界'], foreshadowing: ['半枚旧印纹'] },
        ],
        ten_chapter_summaries: [
          { range: '第41-50章', core_events: '旧案线从外门审问推进到旧阵塔。', character_state_changes: '李玄从被动自证转为主动追查旧印。' },
        ],
        volume_overview: [
          { volume: '第二卷·旧案回声', mainline_progress: '旧印章、残阵缺口和林家旧案开始合流。', turning_point: '林青禾从旁观者转成有限作证者。' },
        ],
        red_lines: ['不得把林青禾写成无条件盟友', '旧印章完整归属不能提前公开'],
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        conflict: '林青禾只能有限作证，旧印归属仍不能公开。',
        scene_cards: [],
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
      { chapter_no: 51, title: '第七层旧影' },
    )

    expect(brief.layered_memory_context.recent_chapter_details[0]).toContain('第46章')
    expect(brief.layered_memory_context.recent_chapter_details[0]).toContain('旧阵塔')
    expect(brief.layered_memory_context.ten_chapter_summaries[0]).toContain('第41-50章')
    expect(brief.layered_memory_context.volume_overview[0]).toContain('第二卷')
    expect(context.chapter_target.layered_memory_context.red_lines).toContain('不得把林青禾写成无条件盟友')
    expect(prompt).toContain('【长篇分层记忆】')
    expect(prompt).toContain('近5章详记')
    expect(prompt).toContain('十章概要')
    expect(prompt).toContain('卷级总览')
    expect(prompt).toContain('旧印章完整归属不能提前公开')
  })

  test('applies oh-story layered memory archive policy to pre-draft brief and prose prompt', () => {
    const project = { title: '万古长夜', reference_config: {} }
    const contextPackage = {
      layered_memory_context: {
        recent_chapter_details: [
          { chapter_no: 44, summary: '旧案外门审问开场。' },
          { chapter_no: 45, summary: '李玄第一次触碰旧印纹。' },
          { chapter_no: 46, summary: '旧阵塔入口打开。' },
          { chapter_no: 47, summary: '林青禾有限作证。' },
          { chapter_no: 48, summary: '半枚旧印纹被确认。' },
          { chapter_no: 49, summary: '残阵缺口回应旧塔禁制。' },
          { chapter_no: 50, summary: '第七层门影出现。' },
        ],
        ten_chapter_summaries: [
          { range: '第41-50章', core_events: '旧案线进入旧阵塔。' },
        ],
        archive_index: [
          { range: '第1-40章', path: '追踪/归档/第001-040章.md', summary: '外门压迫线和旧案前史已压缩归档。' },
        ],
        red_lines: ['旧印章完整归属不能提前公开'],
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 51, title: '第七层旧影' })

    expect(brief.layered_memory_context.recent_chapter_details).toHaveLength(5)
    expect(brief.layered_memory_context.recent_chapter_details.join('｜')).not.toContain('第44章')
    expect(brief.layered_memory_context.recent_chapter_details.join('｜')).not.toContain('第45章')
    expect(brief.layered_memory_context.recent_chapter_details.join('｜')).toContain('第50章')
    expect(context.chapter_target.layered_memory_context.archive_refs[0]).toContain('追踪/归档/第001-040章.md')
    expect(prompt).toContain('归档索引')
    expect(prompt).toContain('第1-40章')
    expect(prompt).toContain('外门压迫线和旧案前史已压缩归档')
  })

  test('carries oh-story daily progress summary into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          progress_summary: {
            last_completed_chapter: 50,
            completed_chapter_count: 1,
            completed_word_count: 3280,
            active_foreshadowing_count: 3,
            recent_changed_characters: ['李玄', '林青禾'],
            next_outline_status: '已有',
            notes: ['旧印章归属仍不能公开', '第51章先接旧阵塔第七层入口'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 51, title: '第七层旧影' })

    expect(brief.progress_summary.last_completed_chapter).toBe(50)
    expect(brief.progress_summary.active_foreshadowing_count).toBe(3)
    expect(context.chapter_target.progress_summary.notes).toContain('旧印章归属仍不能公开')
    expect(prompt).toContain('【日更进度断点】')
    expect(prompt).toContain('最后完成章节：第50章')
    expect(prompt).toContain('活跃伏笔：3条')
    expect(prompt).toContain('第51章先接旧阵塔第七层入口')
  })

  test('carries oh-story daily context snapshot into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          daily_context_snapshot: {
            current_chapter: 50,
            current_scene: '第七层门影刚露出，李玄停在旧阵塔门前。',
            current_emotion_target: '压迫后的短冷和新疑问',
            writing_changes: ['半枚旧印纹会回应旧影', '林青禾仍只能有限作证'],
            pending_clues: ['第七层门影是谁', '旧印章完整归属不能提前公开'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 51, title: '第七层旧影' })

    expect(brief.daily_context_snapshot.current_chapter).toBe(50)
    expect(brief.daily_context_snapshot.current_scene).toContain('第七层门影')
    expect(context.chapter_target.daily_context_snapshot.pending_clues).toContain('第七层门影是谁')
    expect(context.pre_draft_brief.daily_context_snapshot.writing_changes).toContain('半枚旧印纹会回应旧影')
    expect(prompt).toContain('【日更上下文快照】')
    expect(prompt).toContain('当前位置/章：第50章')
    expect(prompt).toContain('当前位置/场景：第七层门影刚露出')
    expect(prompt).toContain('当前位置/情绪目标：压迫后的短冷和新疑问')
    expect(prompt).toContain('本次写作变更：半枚旧印纹会回应旧影')
    expect(prompt).toContain('待处理线索：第七层门影是谁')
  })

  test('director budget omits longform structure contract content from prose prompt snapshot', () => {
    const project = { title: '万古长夜' }
    const contextPackage = {
      oh_story_director: {
        stage: 'draft_prose',
        readiness: 'ready',
        primary_action: {
          key: 'write_chapter_prose',
          label: '生成章节正文',
        },
        blocking_summary: '无阻塞，按预算执行选用合同。',
        selected_contracts: [
          {
            key: 'story_power',
            reason: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
            detail_level: 'full',
          },
        ],
        suppressed_contracts: [
          {
            key: 'longform_structure_contract',
            reason: '本章只需列名，不带入长合同正文。',
            detail_level: 'omit',
          },
        ],
        prompt_budget_plan: {
          full: ['story_power'],
          compact: ['chapter_blueprint'],
          reference: ['continuity'],
          omit: ['longform_structure_contract'],
        },
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        conflict: '旧阵塔门前出现反制。',
        ending_hook: '门影主动回应。',
        longform_structure_contract: {
          note: '开局埋因XYZ_LONGFORM_SHOULD_BE_OMITTED',
        },
        story_power_contract: {
          execution: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧塔门前',
            purpose: '承接上一章钩子。',
            conflict: '门影不让李玄靠近。',
          },
        ],
      },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(project, contextPackage, null, { chapter_no: 51, title: '第七层旧影' })

    expect(prompt).toContain('【oh-story 总导演】')
    expect(prompt).toContain('story_power')
    expect(prompt).toContain('目标阻碍动作反馈XYZ_STORY_POWER_SELECTED')
    expect(prompt).toContain('longform_structure_contract')
    expect(prompt).toContain('omit')
    expect(prompt).not.toContain('XYZ_LONGFORM_SHOULD_BE_OMITTED')
  })

  test('director budget keeps longform structure contract content when not omitted from prose prompt snapshot', () => {
    const project = { title: '万古长夜' }
    const contextPackage = {
      oh_story_director: {
        stage: 'draft_prose',
        readiness: 'ready',
        primary_action: {
          key: 'write_chapter_prose',
          label: '生成章节正文',
        },
        selected_contracts: [
          {
            key: 'story_power',
            reason: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
            detail_level: 'full',
          },
        ],
        suppressed_contracts: [],
        prompt_budget_plan: {
          full: ['story_power'],
          compact: ['longform_structure_contract'],
          reference: [],
          omit: [],
        },
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        conflict: '旧阵塔门前出现反制。',
        ending_hook: '门影主动回应。',
        longform_structure_contract: {
          note: '开局埋因XYZ_LONGFORM_SHOULD_BE_INCLUDED',
        },
        story_power_contract: {
          execution: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧塔门前',
            purpose: '承接上一章钩子。',
            conflict: '门影不让李玄靠近。',
          },
        ],
      },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(project, contextPackage, null, { chapter_no: 51, title: '第七层旧影' })

    expect(prompt).toContain('【oh-story 总导演】')
    expect(prompt).toContain('目标阻碍动作反馈XYZ_STORY_POWER_SELECTED')
    expect(prompt).toContain('XYZ_LONGFORM_SHOULD_BE_INCLUDED')
  })

})
