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

describe('prose word target admission b', () => {
  test('checks reversal contract setup, misdirection and payoff after delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 12, chapter_no: 12, title: '账册反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        reversal_contract: {
          version: 'oh_story_reversal_v1',
          source: 'manual',
          reversal_types: ['信息反转', '身份反转'],
          setup_requirements: ['反转前至少有3处暗示，揭示后能解释前文。'],
          setup_plan: ['账本页码错位', '旧部印记', '证人为什么知道账本细节'],
          misdirection_methods: ['红鲱鱼：执事先声称缺页只是虫蛀。'],
          timing_rules: ['揭示时机在章节 70-85%。'],
          face_slap_rhythm: ['打脸节奏：先让执事公开压迫，再用账册和证人反证。'],
          quality_checks: ['必须确认反转前有公平暗示，揭示后改变局势。'],
        },
      },
    }
    const reversalText = [
      '旧账册摊开时，沈砚先看到页码错位，第三十七页后面直接跳到四十一页。',
      '封皮内侧压着旧部印记，那枚印章和执事袖口的暗纹一模一样。',
      '第二个证人还没进门，却已经说出账本细节：缺页背面有内库名单。',
      '执事冷笑，逼沈砚当众认罪，声称缺页只是虫蛀，旁观弟子几乎都信了这个红鲱鱼。',
      '到了审判尾声，沈砚没有争辩，只把提前备份的账册副本、旧部印记和证人证词分批递上去。',
      '答案揭示：真正调换账册的人不是账房，而是披着旧部身份的执事；身份反转坐实，内库规则被推翻。',
      '执事当场改口又露馅，因为沈砚提交的证据链，长老取消他的资格，审判庭重新调查父亲旧案。',
    ].join('\n')
    const suddenText = [
      '沈砚一直觉得事情很复杂。',
      '执事解释了很多账册、录音、监控、报告和证人证词。',
      '最后突然证明执事才是真凶，所有人都震惊了。',
      '执事被带走，事情结束。',
    ].join('\n')

    const okReport = buildReversalSyncReport(project, chapter, contextPackage, reversalText)
    const warnReport = buildReversalSyncReport(project, chapter, contextPackage, suddenText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('反转设计 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['反转类型', '铺垫暗示', '公平误导', '揭示时机', '打脸节奏']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('反转缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['铺垫暗示', '公平误导', '揭示时机', '反转毒点']))
    expect(warnReport.next_actions.join('；')).toContain('3处暗示')
  })

  test('reads reversal sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '寒门阵师' }
    const chapter = {
      id: 33,
      chapter_no: 33,
      title: '私印反证',
      raw_payload: {
        preDraftBrief: {
          reversalContract: {
            reversalTypes: ['矿堂私印信息反转'],
            setupPlan: ['封门令右下角私印缺半笔', '矿账夹页提前露出供奉姓氏', '证人只认私印不认执事签名'],
            setupRequirements: ['反转前至少有3处私印暗示。'],
            misdirectionMethods: ['红鲱鱼：执事声称私印缺笔只是旧模损耗。'],
            timingRules: ['揭示时机在章节 70-85%。'],
            faceSlapRhythm: ['先让执事公开压私印，再用矿账夹页反证。'],
            qualityChecks: ['私印反转必须公平铺垫，揭示后改变矿堂审判局势。'],
          },
        },
      },
    }

    const report = buildReversalSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 33, title: '私印反证' } },
      '沈砚觉得私印很奇怪。执事解释了很多旧事。最后突然证明执事说谎，众人震惊。',
    )

    expect(report.label).toContain('反转缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('私印缺半笔')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账夹页')
    expect(report.quality_checks.join('｜')).toContain('私印反转')
  })

  test('story state sync persists a reversal_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("reviewType: 'reversal_sync'")
    expect(source).toContain("payloadKey: 'reversal_sync'")
    expect(source).toContain('buildReversalSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.reversal_sync = reversalSync')
  })

  test('checks showdown contract payoff, stage chain and combat logic after delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 14, chapter_no: 14, title: '阵盘亮底' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 14,
        showdown_contract: {
          version: 'oh_story_showdown_v1',
          source: 'manual',
          payoff_release_rules: ['底牌释放后，反派就要受到对应的压制。'],
          three_pressure_shock_rules: [
            '三压一爆三震：友好势力先觉得主角是大佬。',
            '敌方势力至少两次铺垫不服，逼主角上场。',
            '中立势力给第三重压力；主角一爆碾压后，友方、敌方、中立方各自震动。',
          ],
          stage_chain_rules: ['群众层 -> 中间层 -> 核心层震惊传递链。'],
          transmission_channel_rules: ['装逼前必须先铺设人际关系，否则没有传递通道。'],
          shock_chain_rules: ['震惊分层必须基于自身利益和目标。'],
          combat_design_rules: ['打斗是一场表演，展示主角收获。'],
          weak_over_strong_rules: ['以弱胜强必须有信息差、环境利用或心理博弈。'],
          emotion_rhythm_rules: ['情绪节奏执行急 -> 缓 -> 急。'],
          quality_checks: ['爽点到位，主角不委屈，舞台够大。'],
        },
      },
    }
    const showdownText = [
      '开场前，沈砚救过外门弟子的阵盘，也替中间层阵师补过一处残纹，长老席因此愿意看完这场公开审判。',
      '友好势力外门弟子先低声说沈砚像真正的大佬，敌方执事第一次冷笑不服，第二次又逼他上场认输，中立势力长老席也压下判签旁观。',
      '执事当众逼沈砚认输，长老席也压下判签，群众层弟子低声起哄，局势先急起来。',
      '沈砚没有急着争辩，只看了一眼阵盘裂纹，把袖中提前藏好的副阵扣进地砖，这是短暂判断和铺垫。',
      '执事挥剑压上，沈砚借审判台的铜纹错位避开第一击，又用信息差引他踩进残阵空门。',
      '第二击落下前，沈砚亮出底牌，阵盘残纹反咬回去，执事的剑势被当场压制，资格判签反转。',
      '他这次只动用一枚旧阵盘，袖中仍压着三张未揭示的暗牌；残阵压制执事后，又解锁一枚新阵纹，成为下一轮后手。',
      '外门弟子把救阵旧情传给众人，中间层阵师看懂铜纹借势，脸色立刻变了；核心层长老意识到内库阵图规则要重审。',
      '一爆碾压后，友方外门弟子震动得立刻传话，敌方执事破防退后，中立长老席第一次改口。',
      '群众层先震惊，中间层开始复盘利害，核心层当场改判，执事破防退后，沈砚拿回试炼资格。',
      '爽点释放后没有散场，长老要求追查内库阵图源头，下一章的新目标被抛出来。',
    ].join('\n')
    const flatText = [
      '沈砚和执事打了一架。',
      '他突然很厉害，直接赢了。',
      '大家都很震惊，执事输了。',
      '事情结束。',
    ].join('\n')

    const okReport = buildShowdownSyncReport(project, chapter, contextPackage, showdownText)
    const warnReport = buildShowdownSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('高潮对抗 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['爽点释放', '三压一爆三震', '舞台层级', '传递通道', '震惊分层', '战斗/智斗逻辑', '以弱胜强逻辑', '情绪节奏']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('高潮缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['爽点释放', '舞台层级', '传递通道', '震惊分层', '战斗/智斗逻辑']))
    expect(warnReport.next_actions.join('；')).toContain('群众层')
    expect(warnReport.next_actions.join('；')).toContain('传递通道')
  })

  test('reads showdown sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '寒门阵师' }
    const chapter = {
      id: 34,
      chapter_no: 34,
      title: '铜纹压阵',
      raw_payload: {
        preDraftBrief: {
          showdownContract: {
            payoffReleaseRules: ['铜纹底牌释放后，封门执事必须被对应压制。'],
            stageChainRules: ['铜纹群众层 -> 矿堂中间层 -> 供奉核心层震惊传递链。'],
            transmissionChannelRules: ['铜纹传递前必须先铺沈砚救过矿堂阵师的人情。'],
            shockChainRules: ['供奉核心层震惊必须改变矿堂规则评价。'],
            combatDesignRules: ['铜纹智斗是一场表演，展示沈砚新收获。'],
            qualityChecks: ['铜纹高潮必须有压制、传递通道和核心层震惊。'],
          },
        },
      },
    }

    const report = buildShowdownSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 34, title: '铜纹压阵' } },
      '沈砚和执事打了一架。他突然赢了。大家都震惊，事情结束。',
    )

    expect(report.label).toContain('高潮缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('铜纹底牌')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉核心层')
    expect(report.quality_checks.join('｜')).toContain('铜纹高潮')
  })

  test('reads runtime camelCase chapterTarget showdown contract after delivery when chapter_target already exists', () => {
    const report = buildShowdownSyncReport(
      { title: '寒门阵师' },
      { id: 36, chapter_no: 36, title: '赤炉审判' },
      {
        chapter_target: {
          chapter_no: 36,
          title: '赤炉审判',
        },
        chapterTarget: {
          chapterNo: 36,
          showdownContract: {
            payoffReleaseRules: ['赤炉底牌释放后，封门执事必须被当场压制。'],
            stageChainRules: ['赤炉群众层 -> 矿堂中间层 -> 供奉核心层震惊传递链。'],
            qualityChecks: ['赤炉高潮必须兑现底牌压制和核心层震惊。'],
          },
        },
      },
      '沈砚和封门执事打了一架。大家都震惊，事情结束。',
    )

    expect(report.label).toContain('高潮缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉底牌')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉核心层')
    expect(report.quality_checks.join('｜')).toContain('赤炉高潮')
  })

  test('checks oh-story three-pressure one-burst three-shock structure after showdown delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 17, chapter_no: 17, title: '三方震动' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        showdown_contract: {
          version: 'oh_story_showdown_v1',
          source: 'manual',
          three_pressure_shock_rules: [
            '一压：友好势力 -> 觉得男主是大佬。',
            '二压：敌方势力 -> 两次铺垫 + 不服让男主上。',
            '三压：中立势力。',
            '一爆：男主出手碾压。',
            '三震：对三方势力的震惊反应。',
          ],
        },
      },
    }
    const layeredText = [
      '友好势力外门弟子先替沈砚铺压，说他修阵时像真正的大佬。',
      '敌方势力执事第一次冷笑不服，第二次又当众逼他上场认输。',
      '中立势力长老席没有表态，只把判签压下，形成第三重压力。',
      '沈砚一爆出手，旧阵盘当场碾压执事剑势。',
      '三震同时落下：友方外门弟子激动传话，敌方执事破防退后，中立长老席震动后第一次改口。',
    ].join('\n')
    const flatText = [
      '沈砚直接出手碾压执事剑势。',
      '众人都震惊，执事输了。',
    ].join('\n')

    const okReport = buildShowdownSyncReport(project, chapter, contextPackage, layeredText)
    const warnReport = buildShowdownSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('三压一爆三震')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补三压一爆三震')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('three_pressure_shock')
    expect(warnReport.next_actions.join('；')).toContain('友好势力')
    expect(warnReport.next_actions.join('；')).toContain('敌方势力')
    expect(warnReport.next_actions.join('；')).toContain('中立势力')
  })

  test('checks oh-story trump card reserve management after showdown delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 16, chapter_no: 16, title: '只出一牌' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        showdown_contract: {
          version: 'oh_story_showdown_v1',
          source: 'manual',
          payoff_release_rules: ['底牌释放后，反派就要受到对应的压制。'],
          trump_card_reserve_rules: [
            '底牌管理：手里始终有2-3个未揭示的底牌。',
            '每次只出1个底牌，同时获得新技能或新后手。',
          ],
        },
      },
    }
    const managedText = [
      '沈砚没有把底牌全掀，只亮出一枚旧阵盘。',
      '旧阵盘反咬回去，执事的剑势被当场压制。',
      '他袖中仍留着三张未揭示的暗牌，阵盘裂纹又解锁一枚新阵纹，下一章还要追查内库阵图源头。',
    ].join('\n')
    const allInText = [
      '沈砚把所有底牌一口气摊开，旧阵盘、残符、血印和证人链全部砸出去。',
      '执事终于被压制，可他也承认这是最后一张底牌，之后再无后手。',
      '众人震惊后事情结束。',
    ].join('\n')

    const okReport = buildShowdownSyncReport(project, chapter, contextPackage, managedText)
    const warnReport = buildShowdownSyncReport(project, chapter, contextPackage, allInText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('底牌管理')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补底牌管理')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('trump_card_reserve')
    expect(warnReport.next_actions.join('；')).toContain('每次只出1个')
  })

  test('checks oh-story strong-antagonist counterplay layers after showdown delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 15, chapter_no: 15, title: '反预判' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 15,
        showdown_contract: {
          version: 'oh_story_showdown_v1',
          source: 'manual',
          payoff_release_rules: ['底牌释放后，反派就要受到对应的压制。'],
          stage_chain_rules: ['群众层 -> 中间层 -> 核心层震惊传递链。'],
          shock_chain_rules: ['震惊分层必须基于自身利益和目标。'],
          combat_design_rules: ['打斗是一场表演，展示主角收获。'],
          weak_over_strong_rules: ['以弱胜强必须有信息差、环境利用或心理博弈。'],
          counterplay_layers: [
            '反派强时三层破局：硬碰硬、预判反制、反预判。',
            '预判反制：反派出A，主角早准备B克制A。',
            '反预判：反派针对A，主角利用A作陷阱引导反派落入预设B。',
          ],
          emotion_rhythm_rules: ['情绪节奏执行急 -> 缓 -> 急。'],
          quality_checks: ['强敌压迫越强，主角反制越要显得早准备一层。'],
        },
      },
    }
    const layeredText = [
      '开场前，沈砚替外门弟子修过阵盘，也让中间层阵师欠下一次公开作证的人情，这条旧情正好能把结果传给众人。',
      '执事当众压下判签，群众层弟子跟着起哄，长老席也逼沈砚认输，局势先急起来。',
      '沈砚没有急着争辩，只把袖中提前准备的副阵扣进地砖：他早预判到执事会出A，准备用B克制那道剑势。',
      '执事果然改用专门针对残阵的断纹剑，想封住沈砚原本的反制。',
      '沈砚却顺势避开，把断纹剑当成陷阱入口，引他踩进预设的B阵眼，这才亮出底牌反预判。',
      '这次他只出一张旧阵牌，袖中仍留着三张未揭示后手；断纹剑反咬后又解锁一枚新阵纹。',
      '阵盘残纹反咬回去，执事的剑势被当场压制，资格判签反转。',
      '群众层先震惊，中间层阵师看懂铜纹借势，核心层长老意识到内库阵图规则要重审。',
      '爽点释放后没有散场，长老要求追查内库阵图源头，下一章的新目标被抛出来。',
    ].join('\n')
    const flatCounterText = [
      '执事当众压下判签，群众层弟子跟着起哄，长老席也逼沈砚认输，局势先急起来。',
      '沈砚没有急着争辩，只看了一眼阵盘裂纹，等执事挥剑压上。',
      '他借审判台的铜纹错位避开第一击，又用信息差和环境优势反制对手。',
      '第二击落下前，沈砚亮出底牌，阵盘残纹反咬回去，执事的剑势被当场压制，资格判签反转。',
      '这次他只出一张旧阵牌，仍留着三张未揭示暗牌；胜利后又解锁一枚新阵纹。',
      '群众层先震惊，中间层阵师看懂铜纹借势，核心层长老意识到内库阵图规则要重审。',
      '爽点释放后没有散场，长老要求追查内库阵图源头，下一章的新目标被抛出来。',
    ].join('\n')

    const okReport = buildShowdownSyncReport(project, chapter, contextPackage, layeredText)
    const warnReport = buildShowdownSyncReport(project, chapter, contextPackage, flatCounterText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('三层破局')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补三层破局')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('counterplay_layers')
    expect(warnReport.next_actions.join('；')).toContain('预判反制')
  })

  test('story state sync persists a showdown_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("reviewType: 'showdown_sync'")
    expect(source).toContain("payloadKey: 'showdown_sync'")
    expect(source).toContain('buildShowdownSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.showdown_sync = showdownSync')
  })

  test('story state sync persists a spectator_reaction_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: spectatorReactionSync, reviewType: 'spectator_reaction_sync'")
    expect(source).toContain('buildSpectatorReactionSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.spectator_reaction_sync = spectatorReactionSync')
  })

  test('story state sync persists a payoff_setup_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: payoffSetupSync, reviewType: 'payoff_setup_sync'")
    expect(source).toContain('buildPayoffSetupSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.payoff_setup_sync = payoffSetupSync')
  })

  test('checks bridge unit contract position, expectation chain and transition after delivery', () => {
    const project = { title: '旧城账册' }
    const chapter = { id: 15, chapter_no: 15, title: '旧城会审' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 15,
        bridge_unit_contract: {
          version: 'oh_story_bridge_unit_v1',
          source: 'manual',
          bridge_position: '四章桥段第3章：兑现爽点，把阶段回报写透。',
          bridge_unit_plan: ['旧城会审兑现账本期待，并在兑现前挂上新投资人目标。'],
          four_chapter_roles: ['第三章负责兑现，把爽感写透，是桥段里最好写、也最该展开的一章。'],
          expectation_chain_rules: ['兑现旧期待前必须挂上新期待，高潮中埋钩子。'],
          climax_duration_rules: ['小高潮约 3 天阅读节奏内完成，不能无限拖延一个局部问题。'],
          transition_rules: ['尾巴给目标：章末必须让读者知道下一步要争什么。'],
          fatigue_repair_rules: ['连续 2 章没有目标推进时，下一章必须提高冲突密度。'],
          quality_checks: ['桥段位置清楚，连续期待不断，目标推进可见。'],
        },
      },
    }
    const bridgeText = [
      '这一章是四章桥段第3章，旧城会审终于进入兑现位。',
      '沈砚先把上一章留下的旧账本期待压在桌面上，但没有立刻收束，他在兑现前先抛出新投资人目标：拿到账本只是第一步，下一步要争旧城资金入口。',
      '会审现场连续小期待不断：证人先改口，账本再落章，投资人名单只露出一半，高潮中埋下新钩子。',
      '目标推进很清楚，沈砚从洗清旧账推进到拿回项目资格，执事阻碍升级，长老席给出反馈，旧城资源门槛被打开。',
      '这场小高潮当天完成，没有无限拖延；爽点落地后没有散场，关系余波和资金伏笔继续推进。',
      '章尾给出新目标：三日后必须争到新投资人签字，否则旧城项目仍会被对手截走。',
    ].join('\n')
    const flatText = [
      '沈砚参加会审。',
      '大家讨论了一会儿，账本问题解决了。',
      '他觉得事情差不多结束。',
    ].join('\n')

    const okReport = buildBridgeUnitSyncReport(project, chapter, contextPackage, bridgeText)
    const warnReport = buildBridgeUnitSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('桥段节奏 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['桥段位置', '连续期待', '目标推进', '高潮时长', '阶段衔接']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('桥段缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['桥段位置', '连续期待', '目标推进', '阶段衔接']))
    expect(warnReport.next_actions.join('；')).toContain('连续期待')
  })

  test('reads bridge unit sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '旧城账册' }
    const chapter = {
      id: 35,
      chapter_no: 35,
      title: '矿账桥段',
      raw_payload: {
        preDraftBrief: {
          bridgeUnitContract: {
            bridgePosition: '四章桥段第4章：矿账收尾并打开赤炉城新门槛。',
            bridgeUnitPlan: ['矿账桥段先兑现封门旧期待，再挂赤炉城供奉新目标。'],
            expectationChainRules: ['兑现封门旧期待前必须先挂赤炉城供奉新期待。'],
            transitionRules: ['章尾必须给出赤炉城供奉新目标。'],
            qualityChecks: ['矿账桥段必须完成旧期待兑现和赤炉城供奉新目标承接。'],
          },
        },
      },
    }

    const report = buildBridgeUnitSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 35, title: '矿账桥段' } },
      '沈砚参加会审。大家讨论之后，事情解决了。',
    )

    expect(report.label).toContain('桥段缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉城供奉')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账桥段')
    expect(report.quality_checks.join('｜')).toContain('赤炉城供奉新目标')
  })

  test('reads bridge unit sync contract from serialized raw context package chapter target', () => {
    const project = { title: '旧城账册' }
    const chapter = {
      id: 37,
      chapter_no: 37,
      title: '赤炉桥段',
      raw_payload: {
        context_package: {
          chapter_target: {
            bridgeUnitContract: {
              bridgePosition: '四章桥段第4章：赤炉桥段收尾并打开矿脉审查新门槛。',
              bridgeUnitPlan: ['赤炉桥段先兑现封门旧期待，再挂矿脉审查新目标。'],
              expectationChainRules: ['兑现封门旧期待前必须先挂矿脉审查新期待。'],
              transitionRules: ['章尾必须给出矿脉审查新目标。'],
              qualityChecks: ['赤炉桥段必须完成旧期待兑现和矿脉审查新目标承接。'],
            },
          },
        },
      },
    }

    const report = buildBridgeUnitSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 37, title: '赤炉桥段' } },
      '沈砚参加会审。大家讨论之后，事情解决了。',
    )

    expect(report.label).toContain('桥段缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿脉审查')
    expect(report.quality_checks.join('｜')).toContain('赤炉桥段')
  })

  test('story state sync persists a bridge_unit_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: bridgeUnitSync, reviewType: 'bridge_unit_sync'")
    expect(source).toContain('buildBridgeUnitSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.bridge_unit_sync = bridgeUnitSync')
  })

  test('reads opening sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 36,
      chapter_no: 36,
      title: '赤炉城门',
      raw_payload: {
        preDraftBrief: {
          openingContract: {
            requiredBeats: ['前300字让沈砚带着赤炉城门口危机登场', '前1000字抛出矿脉账册真假期待点'],
            foundationPoints: ['人设基点：沈砚必须先活过城门审查', '切入点：矿脉账册封条被调换', '金手指：旧印能检测账册编号'],
            fiveEssentialsRules: ['赤炉开头必须简单、不偏、快、爽、不平。'],
            informationPriority: ['赤炉城规则先随城门危机释放，不能先倒世界观。'],
            qualityChecks: ['赤炉开篇必须同时有城门危机、矿脉账册期待和旧印检测。'],
          },
        },
      },
    }

    const report = buildOpeningSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 36, title: '赤炉城门' } },
      '赤炉城有很长的历史，街道宽阔，风从城门吹过。沈砚走了一会儿，事情暂时还没有进入正题。',
    )

    expect(report.label).toContain('开篇缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉城门口危机')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿脉账册真假')
    expect(report.quality_checks.join('｜')).toContain('旧印检测')
  })

  test('reads prose craft sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 37,
      chapter_no: 37,
      title: '封条错位',
      raw_payload: {
        preDraftBrief: {
          proseCraftContract: {
            povRules: ['封条错位一段必须锁在沈砚当下视角，禁止上帝视角预告。'],
            expressionRules: ['用指尖、呼吸和纸页震动写沈砚的压力。'],
            sceneWeavingRules: ['把封条错位、守门人逼问、沈砚按住旧印揉进同一现场。'],
            objectNumberRules: ['三寸封条和第七号账册必须承担证据功能。'],
            sectionDensityRules: ['每个小节都要有目标、阻碍、信息增量或关系变化。'],
            qualityChecks: ['封条错位必须有视角、身体细节、证据道具和小节密度。'],
          },
        },
      },
    }

    const report = buildProseCraftSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 37, title: '封条错位' } },
      '他不知道的是，所有人都已经看穿真相。沈砚非常愤怒。大厅很宽，墙壁很旧，大家都在等待事情结束。',
    )

    expect(report.label).toContain('正文工艺缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('封条错位')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号账册')
    expect(report.quality_checks.join('｜')).toContain('证据道具')
  })

  test('reads punctuation tone sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 38,
      chapter_no: 38,
      title: '炉牌质问',
      raw_payload: {
        preDraftBrief: {
          punctuationToneContract: {
            tonePunctuationMap: ['炉牌质问要保留功能性问号', '封条揭露爆点只保留一个感叹号', '动作停顿用短句和冒号承接。'],
            forbiddenMarks: ['禁止用省略号和破折号硬造停顿。'],
            sceneTonePlan: ['守门人逼问 -> 沈砚短句反问 -> 封条揭露落点。'],
            qualityChecks: ['炉牌质问必须有功能性问号、动作停顿和封条爆点标点。'],
          },
        },
      },
    }

    const report = buildPunctuationToneSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 38, title: '炉牌质问' } },
      '沈砚说他会证明。守门人沉默。封条落在桌上。众人看着。',
    )

    expect(report.label).toContain('语气标点缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('炉牌质问')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('封条揭露')
    expect(report.quality_checks.join('｜')).toContain('功能性问号')
  })

  test('reads quality audit sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 39,
      chapter_no: 39,
      title: '矿账核对',
      raw_payload: {
        preDraftBrief: {
          qualityAuditContract: {
            structureChecks: ['开头必须给矿账封条异常，中段必须核对第七号账册，章尾必须翻出供奉私印。'],
            chapterPurposeRules: ['本章一句话目的：用矿账核对推进赤炉供奉线；目的词是铺垫和爽点。'],
            progressionChecks: ['删掉本章会影响理解，因为赤炉供奉线从传闻推进到实证。'],
            informationChecks: ['矿账规则必须跟守门人冲突和账册核对释放。'],
            sellingPointExpressionRules: ['矿账卖点要通过对话、反应和封条结果隐性展示。'],
            qualityChecks: ['矿账核对必须证明本章不可删除，并完成结构、推进和信息负载。'],
          },
        },
      },
    }

    const report = buildQualityAuditSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 39, title: '矿账核对' } },
      '沈砚查看账册。大家讨论了一会儿。事情没有变化，等待事情结束。',
    )

    expect(report.label).toContain('质量诊断缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账封条异常')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉供奉线')
    expect(report.quality_checks.join('｜')).toContain('本章不可删除')
  })

  test('reads dialogue sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 40,
      chapter_no: 40,
      title: '守门逼问',
      raw_payload: {
        preDraftBrief: {
          dialogueContract: {
            dialogueGoals: ['守门逼问必须逼出赤炉封条来源'],
            keyLines: ['你怎么知道第七号账册在我手里？'],
            relationshipMoves: ['旁观矿堂账房从中立倒向沈砚'],
            powerLengthRules: ['守门人长句施压，沈砚短句反锁封条漏洞。'],
            qualityChecks: ['守门逼问对白必须推进封条来源、账房站队和短句反锁。'],
          },
        },
      },
    }

    const report = buildDialogueSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 40, title: '守门逼问' } },
      '两个人说了很多背景。守门人解释规则，沈砚点头，事情结束。',
    )

    expect(report.label).toContain('对白缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉封条来源')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号账册')
    expect(report.quality_checks.join('｜')).toContain('短句反锁')
  })

})
