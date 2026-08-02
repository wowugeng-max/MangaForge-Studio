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

describe('prose word target admission a b', () => {
  test('story state sync persists an emotional_arc_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: emotionalArcSync, reviewType: 'emotional_arc_sync'")
    expect(source).toContain('buildEmotionalArcSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.emotional_arc_sync = emotionalArcSync')
  })

  test('checks oh-story chapter hooks after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        opening_hook: '执事当众逼沈砚交出旧账册，旧印章倒计时亮起。',
        ending_hook: '旧印章背面露出第三个证人的名字，执事必须在天亮前封口。',
        conflict: '执事抢旧账册，沈砚必须用旧印章反证。',
        ending_contract: {
          final_state: '沈砚用旧印章反证旧账册被调换。',
          unresolved_question: '第三个证人的名字露出。',
          next_chapter_pull: '执事必须在天亮前封口第三个证人。',
        },
      },
    }
    const hookedText = [
      '“交出旧账册。”执事当众逼近沈砚，旧印章忽然亮起倒计时，必须在天亮前验完。',
      '沈砚抓住旧印章，退半步又站稳，把账册缺页递到众人眼前。',
      '执事伸手抢账册，林青禾拦住他，问：“你怕哪一页？”',
      '沈砚用旧印章反证旧账册被调换，审判庭的灯一盏盏亮起。',
      '最后，旧印章背面露出第三个证人的名字。',
      '执事脸色骤变，门外响起急促脚步声：天亮前，必须封口第三个证人。',
    ].join('\n')
    const flatText = [
      '清晨，院子里很安静。',
      '沈砚想了很多过去的事情，也觉得未来仍然很难。',
      '他和执事谈了一会儿，大家终于明白这件事并不简单。',
      '经历了这一切，沈砚意识到新的开始才刚刚开始。',
    ].join('\n')

    const okReport = buildChapterHookSyncReport(project, chapter, contextPackage, hookedText)
    const warnReport = buildChapterHookSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('章级钩子 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章首钩子', '章尾钩子', '章尾合同']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('章级钩子缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章首钩子', '章尾钩子', '章尾合同']))
    expect(warnReport.next_actions.join('；')).toContain('前100字')
  })

  test('reads chapter hook sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 30,
      chapter_no: 30,
      title: '矿账私印',
      raw_payload: {
        preDraftBrief: {
          chapterHookContract: {
            openingHook: '矿账编号在封门令上自己亮起，沈砚必须立刻判断谁改过账。',
            endingHook: '赤炉城矿脉账册背面出现供奉私印，封门人转身灭口。',
            qualityChecks: ['章首必须用矿账编号触发现场冲突，章尾必须留下供奉私印和灭口压力。'],
          },
        },
      },
    }

    const report = buildChapterHookSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 30, title: '矿账私印' } },
      '清晨的院子很安静。沈砚想起很多旧事，众人也各自沉默。经历这些之后，他知道新的开始才刚刚开始。',
    )

    expect(report.label).toContain('章级钩子缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账编号')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.quality_checks.join('｜')).toContain('灭口压力')
  })

  test('story state sync persists a chapter_hook_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("reviewType: 'chapter_hook_sync'")
    expect(source).toContain("payloadKey: 'chapter_hook_sync'")
    expect(source).toContain('buildChapterHookSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_hook_sync = chapterHookSync')
  })

  test('checks oh-story paragraph hooks after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        paragraph_hook_contract: {
          version: 'oh_story_paragraph_hook_v1',
          micro_hook_types: ['暗牌', '打脸', '代价', '冷发现'],
          hook_combinations: ['暗牌 + 打脸', '倒计时 + 代价'],
          dialogue_escalation: ['对话情绪五级递增：客观陈述事实 -> 主观指责 + 强制命令。'],
          spectator_layers: ['高质量：审判庭执事和林青禾反应必须改变局面。'],
          unfair_injury_hooks: ['损失转嫁型：执事把账册调换的责任甩给沈砚。'],
          forbidden_patterns: ['假悬念', '低风险钩', '同类型连用'],
          quality_checks: ['每 3-5 段必须出现信息、风险、情绪或关系变化。'],
        },
      },
    }
    const hookedText = [
      '执事把旧账册摔到案上，逼沈砚立刻认罪，否则天亮前取消试炼资格。',
      '沈砚没有争辩，只让袖口里的录音继续跑，暗牌还没亮出来。',
      '林青禾低声问：“你确定要等他把话说完？”沈砚点头：“还差一句。”',
      '执事冷笑着命令他跪下，全场都以为沈砚完了。',
      '沈砚这才拿出旧印章和录音，证明账册被调换，执事当众改口。',
      '审判庭长老看清印痕，脸色变了：“这不是普通缺页，是内库名单。”',
      '沈砚冷静地看见名单末尾多出第三个证人的名字，代价也跟着来了：他必须马上去内库。',
    ].join('\n\n')
    const flatText = [
      '沈砚走过长廊，石壁很旧，灯火安静。',
      '他想起过去几年修炼不易，心里有些感慨。',
      '院子里的人站得很整齐，大家都等着结果。',
      '执事说了几句流程，旁边弟子互相看了看。',
      '沈砚觉得事情应该会有办法，只是暂时还没有答案。',
      '风吹过廊柱，天色慢慢暗下来。',
    ].join('\n\n')

    const okReport = buildParagraphHookSyncReport(project, chapter, contextPackage, hookedText)
    const warnReport = buildParagraphHookSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('段落钩子 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['微钩子类型', '钩子组合', '对话递进', '围观者层级', '不公平伤害']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('段落钩子缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['微钩子类型', '钩子组合', '段落停滞']))
    expect(warnReport.next_actions.join('；')).toContain('每 3-5 段')
  })

  test('reads paragraph hook sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 31,
      chapter_no: 31,
      title: '封门代价',
      raw_payload: {
        preDraftBrief: {
          paragraphHookContract: {
            microHookTypes: ['矿账暗牌', '封门代价'],
            hookCombinations: ['矿账暗牌 + 封门代价'],
            dialogueEscalation: ['执事先解释流程，再强制沈砚认下封门代价。'],
            spectatorLayers: ['矿堂供奉必须当场改口，证明封门代价影响权力关系。'],
            qualityChecks: ['关键段落必须出现矿账暗牌和封门代价组合。'],
          },
        },
      },
    }

    const report = buildParagraphHookSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 31, title: '封门代价' } },
      '沈砚走过长廊。石壁很旧。众人沉默。事情暂时没有变化。',
    )

    expect(report.label).toContain('段落钩子缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账暗牌')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('封门代价')
    expect(report.quality_checks.join('｜')).toContain('矿账暗牌和封门代价组合')
  })

  test('story state sync persists a paragraph_hook_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("reviewType: 'paragraph_hook_sync'")
    expect(source).toContain("payloadKey: 'paragraph_hook_sync'")
    expect(source).toContain('buildParagraphHookSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.paragraph_hook_sync = paragraphHookSync')
  })

  test('checks oh-story suspense choreography after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        suspense_contract: {
          version: 'oh_story_suspense_v1',
          information_order_templates: ['意外剧情：提出疑问 -> 虚假提示 -> 公布答案。'],
          suspense_strength: '3 中悬念',
          suspense_cycle: [
            '种：缺页到底藏着什么规则',
            '养：执事给出假提示，声称缺页只是旧账册虫蛀',
            '收：旧印章背面露出第二行字，答案指向第三个证人',
          ],
          trigger_layers: [
            '第1层：展示旧印章初步成果 -> 旁观者初步反应。',
            '第2层：揭示这还不是最终结果 -> 观众期待升级。',
            '第3层：展示超出预期的第三个证人 -> 观众震惊。',
          ],
          expectation_layers: ['两长一短：短期查第三个证人，中期查内库名单，长期查父亲旧案。'],
          shock_layers: ['深度震惊：执事改口 -> 长老发现内库名单 -> 第三个证人名字引爆。'],
          quality_checks: ['疑问、误导、答案和新期待都有正文证据。'],
        },
      },
    }
    const suspenseText = [
      '缺页到底藏着什么规则？沈砚把旧账册摊开时，审判庭里所有人都盯着那道撕痕。',
      '执事先给出假提示，冷笑说：“只是虫蛀，别拿旧纸装神弄鬼，否则天亮前取消你的资格。”旁观弟子稍稍松了口气。',
      '沈砚没有立刻公布答案，只把旧印章按在缺页边缘，第一层印痕亮起，林青禾脸色变了。',
      '可这还不是最终结果，印痕下方又浮出第二行字，长老立刻上前：“这不是旧账，是内库名单。”',
      '答案终于公布：旧账册缺页指向第三个证人，执事当众改口，全场震惊。',
      '第三个证人只是短期期待，内库名单还没查完，父亲旧案背后的长期秘密也被重新拉起。',
    ].join('\n')
    const flatText = [
      '沈砚觉得这件事很神秘，但暂时不能说。',
      '大家都很紧张，不过很快发现只是误会。',
      '执事解释了一下，缺页没有什么特别。',
      '众人松了口气，事情暂时结束。',
    ].join('\n')

    const okReport = buildSuspenseSyncReport(project, chapter, contextPackage, suspenseText)
    const warnReport = buildSuspenseSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('悬念编排 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息顺序', '悬念强度', '三段钩子', '期待接力', '震惊分层']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('悬念缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息顺序', '三段钩子', '期待接力', '悬念禁忌']))
    expect(warnReport.next_actions.join('；')).toContain('疑问')
  })

  test('reads suspense sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 32,
      chapter_no: 32,
      title: '矿账谜题',
      raw_payload: {
        preDraftBrief: {
          suspenseContract: {
            informationOrderTemplates: ['矿账谜题：提出疑问 -> 封门误导 -> 供奉私印答案。'],
            suspenseStrength: '3 中悬念',
            suspenseCycle: [
              '种：矿账缺页到底藏着哪位供奉私印',
              '养：封门人误导沈砚，说缺页只是矿堂旧规',
              '收：账册背面露出供奉私印答案',
            ],
            expectationLayers: ['短期查供奉私印，中期查矿堂账册，长期查赤炉城上层供奉。'],
            shockLayers: ['高位者震惊：矿堂供奉当场改口。'],
            qualityChecks: ['矿账谜题必须有疑问、误导、答案和新期待。'],
          },
        },
      },
    }

    const report = buildSuspenseSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 32, title: '矿账谜题' } },
      '沈砚觉得这件事很神秘，但暂时不能说。大家很快发现只是误会，事情结束。',
    )

    expect(report.label).toContain('悬念缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账谜题')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.quality_checks.join('｜')).toContain('疑问、误导、答案和新期待')
  })

  test('checks oh-story suspense expectation chain after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 13, chapter_no: 13, title: '内库名单' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        suspense_contract: {
          version: 'oh_story_suspense_v1',
          information_order_templates: ['意外剧情：提出疑问 -> 虚假提示 -> 公布答案。'],
          suspense_strength: '3 中悬念',
          suspense_cycle: [
            '种：缺页到底藏着什么规则',
            '养：执事给出假提示，声称缺页只是旧账册虫蛀',
            '收：旧印章背面露出第二行字，答案指向第三个证人',
          ],
          trigger_layers: [
            '第1层：展示旧印章初步成果 -> 旁观者初步反应。',
            '第2层：揭示这还不是最终结果 -> 观众期待升级。',
            '第3层：展示超出预期的第三个证人 -> 观众震惊。',
          ],
          expectation_chain: {
            active_lines: ['短期期待：追查第三个证人', '中期期待：内库名单背后的失踪账册', '长期期待：父亲旧案真相'],
            carry_rules: ['至少两条期待线必须同时运行，当前谜题兑现后不能清空期待。'],
            next_open_loop: ['解决第三个证人后，必须留下内库名单的新门槛或父亲旧案的新线索。'],
          },
          expectation_layers: ['短期查第三个证人，中期查内库名单，长期查父亲旧案。'],
          shock_layers: ['深度震惊：执事改口 -> 长老发现内库名单 -> 第三个证人名字引爆。'],
          quality_checks: ['期待链不断裂，多线并行，麻烦不能消失。'],
        },
      },
    }
    const chainedText = [
      '缺页到底藏着什么规则？沈砚追查第三个证人，把旧账册摊开时，审判庭里所有人都盯着那道撕痕。',
      '执事先给出假提示，冷笑说：“只是虫蛀，别拿旧纸装神弄鬼，否则天亮前取消你的资格。”旁观弟子稍稍松了口气。',
      '沈砚没有立刻公布答案，只把旧印章按在缺页边缘，第一层印痕亮起，林青禾脸色变了。',
      '可这还不是最终结果，印痕下方又浮出第二行字，长老立刻上前：“这不是旧账，是内库名单。”',
      '答案终于公布：旧账册缺页指向第三个证人，执事当众改口，全场震惊。',
      '第三个证人只是短期期待，内库名单背后的失踪账册还没查完，中期期待被铜牌重新吊起；父亲旧案真相仍然没有答案，长期期待也被重新拉起。',
      '章尾新门槛压下来：内库只在子时开门，沈砚必须带铜牌进去，否则名单会被焚毁。',
    ].join('\n')
    const emptiedText = [
      '缺页到底藏着什么规则？沈砚追查第三个证人，把旧账册摊开时，审判庭里所有人都盯着那道撕痕。',
      '执事先给出假提示，冷笑说：“只是虫蛀，别拿旧纸装神弄鬼，否则天亮前取消你的资格。”旁观弟子稍稍松了口气。',
      '沈砚没有立刻公布答案，只把旧印章按在缺页边缘，第一层印痕亮起，林青禾脸色变了。',
      '可这还不是最终结果，印痕下方又浮出第二行字，长老立刻上前：“这不是旧账，是内库名单。”',
      '答案终于公布：旧账册缺页指向第三个证人，执事当众改口，全场震惊。',
      '第三个证人、内库名单和父亲旧案都解释完了，所有期待都兑现。',
      '当前谜题彻底解决，麻烦彻底消失了，也没有新的期待线。',
    ].join('\n')

    const okReport = buildSuspenseSyncReport(project, chapter, contextPackage, chainedText)
    const warnReport = buildSuspenseSyncReport(project, chapter, contextPackage, emptiedText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('期待链')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补期待链')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('expectation_chain')
    expect(warnReport.next_actions.join('；')).toContain('至少两条期待线')
  })

  test('checks oh-story suspense and foreshadowing boundary after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 14, chapter_no: 14, title: '零点铃声' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 14,
        suspense_contract: {
          version: 'oh_story_suspense_v1',
          foreshadowing_boundary_rules: [
            '谜语人是故意不说明，伏笔是巧妙融入剧情、自然不刻意。',
            '信息延迟超过3章且中间无任何推进，就是谜语人，必须删掉或提前给。',
            '短期紧张用悬念，长期线索用伏笔，两者不能混淆。',
          ],
        },
      },
    }
    const boundaryText = [
      '缺页到底藏着什么？沈砚当场提出疑问，又从钟声和门牌水痕里拿到两个可查提示。',
      '旧铃铛沾水就哑了一息，他只是顺手擦干收进袖中，没有解释。',
      '第二次钟声响起时，铃铛又短短哑火，林青禾看见铃口水痕，意识到这不是普通旧物。',
      '章尾答案公布：缺页对应零点钟声，但父亲旧案里的铃铛水痕还没查完，长期线索继续推进。',
    ].join('\n')
    const mysteryBoxText = [
      '这件事很神秘，沈砚知道原因，但作者故意不说。',
      '他只说以后会揭晓真相，超过三章中间没有任何推进。',
      '所有人都在等答案，可正文不给提示、不给代价、也不给可推理线索。',
    ].join('\n')

    const okReport = buildSuspenseSyncReport(project, chapter, contextPackage, boundaryText)
    const warnReport = buildSuspenseSyncReport(project, chapter, contextPackage, mysteryBoxText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('悬念伏笔边界')
    expect(okReport.missed.map((item: any) => item.key)).not.toContain('foreshadowing_boundary_rules')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先修悬念伏笔边界')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('foreshadowing_boundary_rules')
    expect(warnReport.missed.find((item: any) => item.key === 'foreshadowing_boundary_rules')?.missed_items).toEqual(expect.arrayContaining([
      '故意藏信息像谜语人',
      '信息延迟超过3章且中间无推进',
      '缺少可推理提示/代价/自然线索',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('伏笔不是谜语人')
  })

  test('story state sync persists a suspense_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("reviewType: 'suspense_sync'")
    expect(source).toContain("payloadKey: 'suspense_sync'")
    expect(source).toContain('buildSuspenseSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.suspense_sync = suspenseSync')
  })


})
