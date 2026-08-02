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
} from '../novel-writing-service'
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

describe('prose word target b', () => {
  test('merges runtime chapterTarget longform compass into paragraph prose prompt when chapter_target already exists', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 2,
          longformCompass: {
            readerPromise: '超人力量必须持续撞上规则判定。',
            coreConflict: '蛮力破局与规则边界互相反制。',
            immutableRules: ['超人力量不能变成无代价清场'],
            flexibleZones: ['副本可变化，但必须服务规则破局主线'],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作品罗盘】')
    expect(prompt).toContain('超人力量必须持续撞上规则判定')
    expect(prompt).toContain('超人力量不能变成无代价清场')
  })

  test('injects next batch brief into paragraph prose prompt as serial-production boundaries', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第8-10章',
          batch_goal: '三章内进入内门视野。',
          reader_payoff_plan: '升级、打脸、规则反制逐章交付。',
          mainline_focus: '外门危机 -> 内门招揽',
          forbidden_boundary: '第10章前不得揭露规则源头。',
          current_chapter_role: '第8章只负责夜钟规则第一次显形。',
          start_checklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
            { key: 'reader_payoff', label: '读者回报', status: 'ok', detail: '升级、打脸、规则反制逐章交付。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【本批连载任务书】')
    expect(prompt).toContain('批次开工清单')
    expect(prompt).toContain('核心承诺')
    expect(prompt).toContain('三章内进入内门视野')
    expect(prompt).toContain('批量流程规则')
    expect(prompt).toContain('确定本轮写作范围后直接进入 Step 2')
    expect(prompt).toContain('story-explorer')
    expect(prompt).toContain('context_load')
    expect(prompt).toContain('返回不完整')
    expect(prompt).toContain('回退到手动加载')
    expect(prompt).toContain('追踪/上下文.md 缺失时从 追踪/伏笔.md + 追踪/时间线.md 重建')
    expect(prompt).toContain('追踪/伏笔.md 缺失可跳过')
    expect(prompt).toContain('追踪/时间线.md 缺失可从正文推断')
    expect(prompt).toContain('大纲/细纲_第{N}章.md 缺失必须先补建')
    expect(prompt).toContain('确定下一章编号 N')
    expect(prompt).toContain('追踪/上下文.md 的“最后完成章节”')
    expect(prompt).toContain('扫描 正文/ 目录中编号最大的章节 +1')
    expect(prompt).toContain('K 默认 2-3 章')
    expect(prompt).toContain('从细纲中提取本章涉及的角色名')
    expect(prompt).toContain('按需加载 设定/角色/{角色名}.md')
    expect(prompt).toContain('细纲未列出角色时跳过')
    expect(prompt).toContain('继续/续写/日更只表示继续当前日更批量流程')
    expect(prompt).toContain('Step 2.1 标题预检')
    expect(prompt).toContain('同名或明显重复')
    expect(prompt).toContain('按本章核心事件改名')
    expect(prompt).toContain('同步细纲标题与正文文件名')
    expect(prompt).toContain('不得跳过 Step 2.2 状态筛选或 Step 2.3 文风召回')
    expect(prompt).toContain('必须串行逐章写作，不得并发生成多章')
    expect(prompt).toContain('章间不重复询问是否继续')
    expect(prompt).toContain('细纲缺失')
    expect(prompt).toContain('用户要求改变大纲/追踪')
    expect(prompt).toContain('细纲缺失补建流程')
    expect(prompt).toContain('设定/角色/{角色名}.md')
    expect(prompt).toContain('按新版细纲模板补齐内容概括、情节安排、人物关系/出场顺序、情节细化、结尾设定')
    expect(prompt).toContain('无法确认字段写 [待补充]')
    expect(prompt).toContain('不杜撰')
    expect(prompt).toContain('每章写完立即更新')
    expect(prompt).toContain('追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md')
    expect(prompt).toContain('追踪/上下文.md 只更新进度元信息')
    expect(prompt).toContain('不写详细角色状态/伏笔内容')
    expect(prompt).toContain('超过30章时')
    expect(prompt).toContain('已写内容摘要按三层结构')
    expect(prompt).toContain('压缩早期章节、保留近期细节')
    expect(prompt).toContain('近5章详记、十章概要、卷级总览')
    expect(prompt).toContain('每50章或卷结束')
    expect(prompt).toContain('追踪/归档')
    expect(prompt).toContain('活跃伏笔、时间线、角色状态仍以当前文件为准')
    expect(prompt).toContain('批量写作模式跳过单章 story-review lean')
    expect(prompt).toContain('全部写完后再统一执行 Phase 5 质量检查')
    expect(prompt).toContain('Phase 5 完整检查清单')
    expect(prompt).toContain('禁用词扫描、标题去重检查、正文元信息扫描和章尾钩子检查')
    expect(prompt).toContain('命中时必须回对应正文或细纲修复')
    expect(prompt).toContain('Phase 5 对照细纲核对')
    expect(prompt).toContain('新版细纲核对内容概括五段式、情节安排多线、人物关系变化/出场顺序、代价兑现/收益兑现')
    expect(prompt).toContain('旧版细纲只核对核心事件、目标情绪、章首/章尾钩子和字数目标')
    expect(prompt).toContain('伏笔盘点仅本轮增量')
    expect(prompt).toContain('本批新增/推进/回收的伏笔已写入追踪/伏笔.md并更新状态')
    expect(prompt).toContain('不得通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(prompt).toContain('确定性收尾')
    expect(prompt).toContain('主会话在本批实际落盘正文上运行 normalize-punctuation.js')
    expect(prompt).toContain('check-ai-patterns.js --check')
    expect(prompt).toContain('narrative-writer agent 不运行这些脚本')
    expect(prompt).toContain('本轮 workflow 内实际读取或刚更新')
    expect(prompt).toContain('不得用未标明来源的聊天记忆替代')
    expect(prompt).toContain('首次日更兜底')
    expect(prompt).toContain('追踪文件全部为空或不存在')
    expect(prompt).toContain('大纲/卷纲_当前卷.md')
    expect(prompt).toContain('最新一章正文')
    expect(prompt).toContain('重建上下文')
    expect(prompt).toContain('新版细纲优先读取内容概括、情节安排、人物关系和出场顺序')
    expect(prompt).toContain('旧版细纲缺这些字段不阻塞')
    expect(prompt).toContain('回退到核心事件、目标情绪、章首/章尾钩子和字数目标')
    expect(prompt).toContain('新版细纲进入意图确认时')
    expect(prompt).toContain('内容概括决定起承转合')
    expect(prompt).toContain('人物关系和出场顺序决定镜头进入顺序')
    expect(prompt).toContain('情节细化决定代价兑现/收益兑现')
    expect(prompt).toContain('Step 2.4 craft')
    expect(prompt).toContain('Step 2.3 对标召回')
    expect(prompt).toContain('剧情/情绪模块.md、剧情/节奏.md、文风.md')
    expect(prompt).toContain('情绪模块/节奏参照优先')
    expect(prompt).toContain('文风.md 只管表达层')
    expect(prompt).toContain('gaps/conflict 必须进入意图确认')
    expect(prompt).toContain('不得用文风接近掩盖模块或节奏缺失')
    expect(prompt).toContain('对标缺口分流')
    expect(prompt).toContain('missing_primary_contract/profile_missing')
    expect(prompt).toContain('不得进入 narrative-writer')
    expect(prompt).toContain('legacy_deconstruction')
    expect(prompt).toContain('module_missing/rhythm_missing')
    expect(prompt).toContain('matched_deep_dive_missing')
    expect(prompt).toContain('不得在后续报告中反转为 false')
    expect(prompt).toContain('无 story-explorer 时降级')
    expect(prompt).toContain('手动按对标书路径查找')
    expect(prompt).toContain('先读 剧情/情绪模块.md')
    expect(prompt).toContain('grep 章节/*_摘要.md 的「基调」')
    expect(prompt).toContain('第1-3章_深度拆解.md')
    expect(prompt).toContain('v12 停止修复，legacy 才回退继续')
    expect(prompt).toContain('资料研究按需')
    expect(prompt).toContain('story-researcher')
    expect(prompt).toContain('参考资料/')
    expect(prompt).toContain('研究完成后再继续写作')
    expect(prompt).toContain('不得编造确定事实')
    expect(prompt).toContain('字数验证')
    expect(prompt).toContain('优先 Python 字符统计')
    expect(prompt).toContain('wc -m 仅作 Unix 备选')
    expect(prompt).toContain('低于目标 90%')
    expect(prompt).toContain('强制扩充')
    expect(prompt).toContain('爽点出手前先铺可指认的危机/期待')
    expect(prompt).toContain('不铺=空洞')
    expect(prompt).toContain('在场配角放大成差异化反应')
    expect(prompt).toContain('信息型配角不当科普嘴')
    expect(prompt).toContain('不得提前消费后续章节爆点')
    expect(prompt).toContain('第8章只负责夜钟规则第一次显形')
  })

  test('injects camelCase root next batch brief into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        nextBatchBrief: {
          chapterRangeLabel: '第8-10章',
          batchGoal: '三章内进入内门视野。',
          readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
          mainlineFocus: '外门危机 -> 内门招揽',
          forbiddenBoundary: '第10章前不得揭露规则源头。',
          currentChapterRole: '第8章只负责夜钟规则第一次显形。',
          startChecklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【本批连载任务书】')
    expect(prompt).toContain('三章内进入内门视野')
    expect(prompt).toContain('第8章只负责夜钟规则第一次显形')
    expect(prompt).toContain('核心承诺')
  })

  test('injects story unit context into paragraph prose prompt as event-package boundaries', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        story_unit_context: {
          title: '试炼前夜剧情单元',
          chapter_range_label: '第7-12章',
          current_chapter_role: '入口钩子',
          unit_goal: '六章内完成外门试炼前夜事件包。',
          entry_hook: '第7章以试炼倒计时开场。',
          pressure_escalation: ['执事设局', '试炼规则反噬'],
          mini_climax_payoff: '第10章公开打脸执事。',
          setup_and_storyline: ['阵盘第二道裂纹埋线', '外门压迫主线阶段兑现'],
          exit_hook: '第12章内门长老亲自点名。',
          forbidden_advance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          conflict: '是否提前暴露主角底牌。',
          ending_hook: '执事在名册上划掉主角名字。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 7, title: '试炼倒计时' },
    )

    expect(prompt).toContain('【剧情单元任务】')
    expect(prompt).toContain('执行 chapter_target.story_unit_context')
    expect(prompt).toContain('入口钩子')
    expect(prompt).toContain('第10章公开打脸执事')
    expect(prompt).toContain('不得提前解决内门招揽条件')
  })

  test('injects camelCase root story unit context into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        storyUnitContext: {
          title: '试炼前夜剧情单元',
          chapterRangeLabel: '第7-12章',
          currentChapterRole: '压力升级/推进',
          unitGoal: '六章内完成外门试炼前夜事件包。',
          pressureEscalation: ['执事设局'],
          setupAndStoryline: ['阵盘第二道裂纹埋线'],
          miniClimaxPayoff: '第10章公开打脸执事。',
          exitHook: '第12章内门长老亲自点名。',
          forbiddenAdvance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          conflict: '是否提前暴露主角底牌。',
          ending_hook: '执事在名册上划掉主角名字。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 7, title: '试炼倒计时' },
    )

    expect(prompt).toContain('【剧情单元任务】')
    expect(prompt).toContain('压力升级/推进')
    expect(prompt).toContain('执事设局')
    expect(prompt).toContain('不得提前解决内门招揽条件')
  })

  test('injects rolling-plan signature scene repair into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 9,
          title: '新压力源',
          summary: '安全区被迫变成临时战场。',
          conflict: '旧秩序压制新晋黑马。',
          ending_hook: '道具背面刻着禁用标记。',
          signature_scene_brief: {
            signature_scene: '主角在倒塌走廊里反手点亮禁用阵纹，把安全区变成审判场。',
            scene_repair_target: '修复 IP场面覆盖 1/10 的强场面空窗。',
            reader_payoff: '规则反杀爽点。',
            storyline_service: '推进外门试炼主线。',
          },
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 9, title: '新压力源' },
    )

    expect(prompt).toContain('【本章标志性场面补位】')
    expect(prompt).toContain('必须把 signature_scene 写成正文核心场面')
    expect(prompt).toContain('审判场')
    expect(prompt).toContain('IP场面覆盖 1/10')
    expect(prompt).toContain('外门试炼主线')
  })

  test('injects safe batch preflight into paragraph prose prompt as continuous-production guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          guardrail_status: 'caution',
          safe_chapter_count: 1,
          chapter_range_label: '第8章',
          allowed_chapter_nos: [8],
          blocked_chapter_nos: [9],
          guardrails: [
            { label: '近10章疲劳', status: 'warn', detail: '近10章冲突来源、回报形态和章末问题同质化。' },
            { label: '批次任务书', status: 'warn', detail: '第9章缺少明确章末钩子。' },
          ],
          warnings: [
            '近10章疲劳：下一批章节要更换压迫来源、回报形态、章末问题或可视化场面。',
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【安全连写预执行门禁】')
    expect(prompt).toContain('近10章冲突来源、回报形态和章末问题同质化')
    expect(prompt).toContain('更换压迫来源、回报形态、章末问题或可视化场面')
    expect(prompt).toContain('执行 chapter_target.batch_preflight')
  })

  test('injects safe batch delivery-risk obligations into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          source: 'auto_creation_safe_batch_preflight',
          delivery_risk_carry_over: {
            source: 'chapter_delivery_risk_carry_over',
            source_chapter_no: 7,
            apply_to_chapter_no: 8,
            label: '待修复 3',
            priority_label: '优先修章末翻页',
            items: ['修吸引力：吸引力缺口 2', '补创新：创新缺口 1'],
            required_actions: ['前300字接住门外学生压迫', '中段补规则反制创新', '章末重做翻页问题'],
            opening_actions: ['开篇先补异常压迫'],
            middle_actions: ['中段补规则反制创新'],
            ending_actions: ['章末重做翻页问题'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【安全连写交稿风险承接】')
    expect(prompt).toContain('执行 batch_preflight.delivery_risk_carry_over')
    expect(prompt).toContain('前300字接住门外学生压迫')
    expect(prompt).toContain('章末重做翻页问题')
  })

  test('injects safe batch creation contract carry-over into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          source: 'auto_creation_safe_batch_preflight',
          delivery_risk_carry_over: {
            source: 'chapter_delivery_risk_carry_over',
            source_chapter_no: 7,
            apply_to_chapter_no: 8,
            label: '创作契约：执行缺口 4',
            priority_label: '优先修创作契约',
            items: [
              '创作契约：目标读者缺口 1',
              '创作契约：题材定位缺口 1',
              '创作契约：核心承诺缺口 1',
              '创作契约：追读留存缺口 1',
            ],
            required_actions: [
              '前300字把被轻视的核心痛苦写成现场压力',
              '中段用阵修长板识阵、破阵、反制',
              '章末回到规则反制的核心承诺并留下追读问题',
            ],
            creation_contract_carry_over: {
              priority_label: '优先修创作契约',
              items: [
                '创作契约：目标读者缺口 1',
                '创作契约：题材定位缺口 1',
                '创作契约：核心承诺缺口 1',
                '创作契约：追读留存缺口 1',
              ],
              checklist: ['target_reader', 'genre_positioning', 'core_promise', 'reader_retention'],
              required_actions: [
                '前300字把被轻视的核心痛苦写成现场压力',
                '中段用阵修长板识阵、破阵、反制',
                '章末回到规则反制的核心承诺并留下追读问题',
              ],
              policy: '安全连写第一章必须先修创作契约，把目标读者、题材定位、核心承诺、追读留存写成可见正文证据。',
            },
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【安全连写创作契约承接】')
    expect(prompt).toContain('执行 batch_preflight.delivery_risk_carry_over.creation_contract_carry_over')
    expect(prompt).toContain('target_reader、genre_positioning、core_promise、reader_retention')
    expect(prompt).toContain('前300字把被轻视的核心痛苦写成现场压力')
    expect(prompt).toContain('中段用阵修长板识阵、破阵、反制')
    expect(prompt).toContain('章末回到规则反制的核心承诺并留下追读问题')
    expect(prompt).toContain('不能只在旁白中声明契约已修复')
    expect(prompt).toContain('目标读者、题材定位、核心承诺、追读留存')
  })

  test('keeps creation contract carry-over when safe batch parent has no generic risk rows', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          source: 'auto_creation_safe_batch_preflight',
          delivery_risk_carry_over: {
            creation_contract_carry_over: {
              priority_label: '优先修创作契约',
              items: [
                '创作契约：目标读者缺口 1',
                '创作契约：题材定位缺口 1',
              ],
              checklist: ['target_reader', 'genre_positioning', 'core_promise', 'reader_retention'],
              required_actions: [
                '前300字把被轻视的核心痛苦写成现场压力',
                '章末把规则反制变成下一页问题',
              ],
              policy: '安全连写第一章必须先修创作契约。',
            },
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【安全连写创作契约承接】')
    expect(prompt).toContain('执行 batch_preflight.delivery_risk_carry_over.creation_contract_carry_over')
    expect(prompt).toContain('前300字把被轻视的核心痛苦写成现场压力')
    expect(prompt).toContain('章末把规则反制变成下一页问题')
  })

  test('injects safe batch chapter handoff contract into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          source: 'auto_creation_safe_batch_preflight',
          chapter_handoff_contract: {
            source: 'safe_batch_chapter_handoff_contract',
            from_chapter_no: 7,
            apply_to_chapter_no: 8,
            previous_handoff: '第7章最后一幕：阵盘亮起第二道裂纹，执事当场逼主角交出阵盘。',
            opening_obligations: ['阵盘第二道裂纹必须在开篇造成可见压力'],
            must_deliver: ['主角必须用阵法反制执事试探'],
            keep_alive: ['是谁在背后改试炼规则'],
            overdue: ['内门长老为何提前关注主角'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【安全连写章节交接契约】')
    expect(prompt).toContain('执行 batch_preflight.chapter_handoff_contract')
    expect(prompt).toContain('阵盘第二道裂纹必须在开篇造成可见压力')
    expect(prompt).toContain('主角必须用阵法反制执事试探')
    expect(prompt).toContain('是谁在背后改试炼规则')
  })

})
