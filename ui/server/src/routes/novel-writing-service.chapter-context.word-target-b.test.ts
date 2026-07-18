import '../novel-writing-service/quality/review-merge.unit.test'
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

function proseQualityRisksSource() {
  const dir = join(import.meta.dir, '../novel-writing-service/quality')
  return [
    'prose-quality-risks.ts',
    'prose-quality-risks-extended.ts',
    'prose-quality-risks-audience.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('chapter context word-target b', () => {
  test('accepts complete artifact protocol receipts with locatable chapter evidence', () => {
    const report = buildArtifactProtocolReceiptSyncReport(
      {},
      { id: 7, chapter_no: 12, title: '禁库门牌' },
      {
        oh_story_delivery_receipts: {
          pre_draft_execution_receipts: {
            artifact_protocol_receipts: [
              {
                key: 'chapter_blueprint',
                artifact_path: '大纲/细纲_第012章.md',
                status: 'ready',
                required_fields: ['内容概括', '情节安排', '人物关系和出场顺序', '情节细化', '结尾设定和钩子'],
                evidence: '禁库门牌从账册夹层里掉出来，沈霜立刻改变证词。',
                remaining_risk: '',
              },
            ],
          },
        },
      },
      '禁库门牌从账册夹层里掉出来，沈霜立刻改变证词。',
    )

    expect(report.status).toBe('ok')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
  })

  test('falls back to stored oh-story delivery risk receipts when prose review omits them', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {},
      {
        chapter_target: {
          delivery_receipts: {
            delivery_risk_receipts: [
              {
                risk_item: '章末钩子',
                required_action: '用第二枚门牌露出半截制造翻页。',
                delivered: true,
                changed_evidence: '第二枚门牌从门缝里露出半截。',
                remaining_risk: '',
              },
            ],
          },
        },
      },
      '林青禾刚要后退，第二枚门牌从门缝里露出半截。',
    )

    expect(receipts).toHaveLength(1)
    expect(receipts[0].risk_item).toBe('章末钩子')
    expect(receipts[0].required_action).toContain('第二枚门牌')
    expect(receipts[0].evidence).toContain('第二枚门牌从门缝里露出半截')
    expect(receipts[0].delivered).toBe(true)
  })

  test('deduplicates delivery risk receipts by keeping the latest revision state', () => {
    const receipts = uniqueDeliveryRiskReceipts([
      {
        risk_item: '章末追读',
        required_action: '把第二枚门牌压到最后一幕',
        delivered: false,
        evidence: '初稿没有兑现',
        remaining_risk: '初稿缺章末门牌',
      },
      {
        risk_item: '章末追读',
        required_action: '把第二枚门牌压到最后一幕',
        delivered: true,
        evidence: '第二枚门牌在最后一幕翻出。',
        remaining_risk: '',
      },
    ])

    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({
      risk_item: '章末追读',
      required_action: '把第二枚门牌压到最后一幕',
      delivered: true,
      remaining_risk: '',
    })
  })

  test('creates a failed delivery risk receipt when carry-over exists but review omits receipts', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {},
      {
        chapter_target: {
          delivery_risk_carry_over: {
            items: ['IP场面延展：待延展 1'],
            required_actions: ['修复：下一章必须延展或回声 IP 场面「玻璃门内外对峙」；保留门槛白线的视觉记忆。'],
          },
        },
      },
    )

    expect(receipts).toHaveLength(1)
    expect(receipts[0].risk_item).toContain('IP场面延展')
    expect(receipts[0].required_action).toContain('玻璃门内外对峙')
    expect(receipts[0].delivered).toBe(false)
    expect(receipts[0].remaining_risk).toContain('承接回执缺失')
  })

  test('creates a failed delivery risk receipt for omitted safe-batch carry-over receipts', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {},
      {
        batch_preflight: {
          delivery_risk_carry_over: {
            items: ['安全连写承接：章末翻页缺口 1'],
            required_actions: ['开篇必须承接上一章水迹名字，并在章末给出广播室名单的新钩子。'],
          },
        },
      },
    )

    expect(receipts).toHaveLength(1)
    expect(receipts[0].risk_item).toContain('安全连写承接')
    expect(receipts[0].required_action).toContain('广播室名单')
    expect(receipts[0].delivered).toBe(false)
    expect(receipts[0].remaining_risk).toContain('承接回执缺失')
  })

  test('creates failed receipts for every carry-over row when review omits all receipts', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {},
      {
        chapter_target: {
          delivery_risk_carry_over: {
            items: ['新资产入库：待确认 1'],
            required_actions: ['确认周远和黑色钥匙的资产状态。'],
          },
        },
        batch_preflight: {
          delivery_risk_carry_over: {
            items: ['安全连写承接：待兑现 2'],
            required_actions: [
              '开篇必须承接上一章水迹名字。',
              '章末必须给出广播室名单的新钩子。',
            ],
          },
        },
      },
    )

    expect(receipts).toHaveLength(3)
    expect(receipts.map((item: any) => item.required_action).join('｜')).toContain('黑色钥匙')
    expect(receipts.map((item: any) => item.required_action).join('｜')).toContain('水迹名字')
    expect(receipts.map((item: any) => item.required_action).join('｜')).toContain('广播室名单')
    expect(receipts.every((item: any) => item.delivered === false)).toBe(true)
  })

  test('keeps batch carry-over receipts when chapter carry-over receipts are also present', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {
        delivery_risk_receipts: [
          {
            risk_item: '新资产入库：待确认 1',
            required_action: '确认周远和黑色钥匙的资产状态。',
            delivered: true,
            evidence: '周远把黑色钥匙交到林青禾手里。',
            remaining_risk: '无',
          },
        ],
      },
      {
        chapter_target: {
          delivery_risk_carry_over: {
            items: ['新资产入库：待确认 1'],
            required_actions: ['确认周远和黑色钥匙的资产状态。'],
          },
        },
        batch_preflight: {
          delivery_risk_carry_over: {
            items: ['安全连写承接：章末翻页缺口 1'],
            required_actions: ['开篇必须承接上一章水迹名字，并在章末给出广播室名单的新钩子。'],
          },
        },
      },
      '周远把黑色钥匙交到林青禾手里，低声说广播室还有一份名单。',
    )

    expect(receipts).toHaveLength(2)
    expect(receipts[1].risk_item).toContain('安全连写承接')
    expect(receipts[1].required_action).toContain('广播室名单')
    expect(receipts[1].delivered).toBe(false)
  })

  test('rejects delivered delivery risk receipts when prose evidence is generic and missing from the chapter', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {
        delivery_risk_receipts: [
          {
            risk_item: 'IP场面延展：待延展 1',
            required_action: '延展玻璃门内外对峙的门槛白线强画面。',
            delivered: true,
            evidence: '已处理。',
            remaining_risk: '无',
          },
        ],
      },
      {
        chapter_target: {
          delivery_risk_carry_over: {
            items: ['IP场面延展：待延展 1'],
            required_actions: ['延展玻璃门内外对峙的门槛白线强画面。'],
          },
        },
      },
      '林青禾推开广播室的门，旧名单在灯下翻动。周远抬头问她下一步怎么查。',
    )

    expect(receipts[0].delivered).toBe(false)
    expect(receipts[0].remaining_risk).toContain('缺少可核验的正文证据')
  })

  test('creates failed receipts for carry-over items omitted by partial delivery risk receipts', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {
        delivery_risk_receipts: [
          {
            risk_item: '新资产入库：待确认 1',
            required_action: '确认周远和黑色钥匙的资产状态。',
            delivered: true,
            evidence: '周远把黑色钥匙交到林青禾手里。',
            remaining_risk: '无',
          },
        ],
      },
      {
        chapter_target: {
          delivery_risk_carry_over: {
            items: ['新资产入库：待确认 1', 'IP场面延展：待延展 1'],
            required_actions: ['确认周远和黑色钥匙的资产状态。', '延展玻璃门内外对峙的门槛白线强画面。'],
          },
        },
      },
      '周远把黑色钥匙交到林青禾手里，低声说广播室还有一份名单。',
    )

    expect(receipts).toHaveLength(2)
    expect(receipts[1].risk_item).toContain('IP场面延展')
    expect(receipts[1].required_action).toContain('玻璃门内外对峙')
    expect(receipts[1].delivered).toBe(false)
    expect(receipts[1].remaining_risk).toContain('承接回执缺失')
  })

  test('creates failed receipts for required actions omitted under one carry-over item', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {
        delivery_risk_receipts: [
          {
            risk_item: 'IP场面延展：待延展 2',
            required_action: '延展玻璃门内外对峙的门槛白线强画面。',
            delivered: true,
            evidence: '玻璃门内外对峙时，门槛白线像退潮一样露出来。',
            remaining_risk: '无',
          },
        ],
      },
      {
        chapter_target: {
          delivery_risk_carry_over: {
            items: ['IP场面延展：待延展 2'],
            required_actions: [
              '延展玻璃门内外对峙的门槛白线强画面。',
              '把广播室名单翻页做成短剧第一集结尾钩子。',
            ],
          },
        },
      },
      '玻璃门内外对峙时，门槛白线像退潮一样露出来。',
    )

    expect(receipts).toHaveLength(2)
    expect(receipts[1].required_action).toContain('广播室名单翻页')
    expect(receipts[1].delivered).toBe(false)
    expect(receipts[1].remaining_risk).toContain('承接回执缺失')
  })

  test('creates failed receipts for omitted forbidden repeat carry-over checks', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {},
      {
        chapter_target: {
          delivery_risk_carry_over: {
            items: ['质量续航：下一章计划 2'],
            required_actions: ['修复：把门外学生身份追查变成下一章主目标。'],
            forbidden_repeats: ['不要再用“他知道，这只是开始”总结体收尾。'],
          },
        },
      },
      '他知道，这只是开始。',
    )

    expect(receipts).toHaveLength(2)
    expect(receipts[1].risk_item).toContain('质量续航')
    expect(receipts[1].required_action).toContain('禁用重复')
    expect(receipts[1].required_action).toContain('不要再用“他知道，这只是开始”总结体收尾')
    expect(receipts[1].delivered).toBe(false)
    expect(receipts[1].remaining_risk).toContain('承接回执缺失')
  })

  test('carries deslop repair receipt residual risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 209,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                deslop_repair_receipts: [
                  {
                    gate: 'F',
                    label: '章末总结升华',
                    original_evidence: '一切才刚刚开始。',
                    applied_fix: '改成现场动作收束',
                    changed_evidence: '玻璃门上的水痕忽然倒着流回学生袖口。',
                    remaining_risk: '下一章不能复现上一章残留的 Gate F 章末总结体，要用现场动作开篇承接。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
      { chapter_no: 3, title: '门外学生' },
    )

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('去AI味闭环：去AI味残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不能复现上一章残留的 Gate F 章末总结体')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('去AI味闭环开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('现场动作')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('Gate F')
    expect(prompt).toContain('去AI味闭环：去AI味残留 1')
    expect(prompt).toContain('不能复现上一章残留的 Gate F 章末总结体')
  })

  test('carries quality audit repair receipt residual risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 210,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                oh_story_delivery_receipts: {
                  quality_audit_repair_receipts: [
                    {
                      check_key: 'chapter_progress',
                      label: '章节推进',
                      original_evidence: '删掉这一章不影响理解，旧证没有改变局势。',
                      applied_fix: '让旧证触发守军换防。',
                      changed_evidence: '守军听完旧证后立刻改了城门换防令。',
                      remaining_risk: '下一章必须写出换防令造成的新阻碍，证明上一章局势变化没有空转。',
                    },
                  ],
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
      { chapter_no: 3, title: '门外学生' },
    )

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('质量诊断闭环：质量诊断残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('换防令造成的新阻碍')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('质量诊断闭环开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('换防令造成的新阻碍')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('chapter_progress')
    expect(prompt).toContain('质量诊断闭环：质量诊断残留 1')
    expect(prompt).toContain('换防令造成的新阻碍')
  })

  test('asks prose revision to repair missed delivery risk receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(revisionPrompt).toContain('delivery_risk_receipts')
    expect(revisionPrompt).toContain('delivered=false')
    expect(revisionPrompt).toContain('remaining_risk')
    expect(revisionPrompt).toContain('承接残留')
    expect(revisionPrompt).toContain('必须修到正文中可见')
    expect(revisionPrompt).toContain('逐条修复 delivery_risk_receipts')
    expect(revisionPrompt).toContain('每条 delivered=false 或 remaining_risk 非空')
    expect(revisionPrompt).toContain('revision_receipts 必须逐条对应 delivery_risk_receipts')
    expect(revisionPrompt).toContain('不能只修第一条')
    expect(revisionPrompt).toContain('failedDeliveryRiskReceipts')
    expect(revisionPrompt).toContain('deliveryRiskReceiptRemainingRisk')
    expect(revisionPrompt).toContain('repair_segment')
    expect(revisionPrompt).toContain('opening_actions 失败项必须修到前300字')
    expect(revisionPrompt).toContain('ending_actions 失败项必须修到最后300字')
    expect(revisionPrompt).toContain('不得把章末风险挪到开篇或中段')
    expect(revisionPrompt).toContain('【未闭环承接风险回执】')
  })

  test('asks prose revision to output nested oh-story delivery receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    const outputContract = revisionPrompt.slice(
      revisionPrompt.indexOf('请输出 JSON'),
      revisionPrompt.indexOf('].join', revisionPrompt.indexOf('请输出 JSON')),
    )

    expect(outputContract).toContain('oh_story_delivery_receipts')
    expect(outputContract).toContain('chapter_blueprint')
    expect(outputContract).toContain('scene_card_receipts')
    expect(outputContract).toContain('delivery_risk_receipts')
    expect(outputContract).toContain('revision_receipts')
    expect(outputContract).toContain('deslop_repair_receipts')
    expect(outputContract).toContain('quality_audit_repair_receipts')
    expect(outputContract).toContain('pre_draft_execution_receipts')
    expect(outputContract).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks')
    expect(outputContract).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks')
    expect(outputContract).toContain('所有修订回执必须同时写入 oh_story_delivery_receipts')
  })

  test('asks prose revision to output context comparison receipts before rewriting', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const outputContract = revisionPrompt.slice(
      revisionPrompt.indexOf('请输出 JSON'),
      revisionPrompt.indexOf('].join', revisionPrompt.indexOf('请输出 JSON')),
    )

    expect(revisionPrompt).toContain('revision_context_receipts')
    expect(revisionPrompt).toContain('previous_chapter')
    expect(revisionPrompt).toContain('next_chapter')
    expect(revisionPrompt).toContain('foreshadowing')
    expect(revisionPrompt).toContain('character_cards')
    expect(revisionPrompt).toContain('timeline')
    expect(revisionPrompt).toContain('setting_context')
    expect(revisionPrompt).toContain('正文元信息扫描')
    expect(revisionPrompt).toContain('禁用词扫描')
    expect(revisionPrompt).toContain('无法确认')
    expect(outputContract).toContain('revision_context_receipts')
    expect(outputContract).toContain('oh_story_delivery_receipts 必须包含')
    expect(outputContract).toContain('revision_context_receipts(array)')
  })

  test('asks prose self review for oh-story style findings and keeps them for revision', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('统一 Findings Schema')
    expect(reviewPrompt).toContain('severity(S1|S2|S3|S4)')
    expect(reviewPrompt).toContain('category(structure|character|prose|consistency|platform|factual|format|causal|rule_boundary)')
    expect(reviewPrompt).toContain('location')
    expect(reviewPrompt).toContain('evidence')
    expect(reviewPrompt).toContain('fix')
    expect(revisionPrompt).toContain('issues[].evidence')
    expect(revisionPrompt).toContain('issues[].fix')
    expect(revisionPrompt).toContain('revision_receipts')
    expect(revisionPrompt).toContain('issue_index')
    expect(revisionPrompt).toContain('changed_evidence')
    expect(revisionPrompt).toContain('remaining_risk')
  })

  test('asks prose self review and revision to enforce platform rubric checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedDeslopChecks = ['),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedDeslopChecks = [')),
    )

    expect(reviewPrompt).toContain('chapter_target.platform_rubric')
    expect(reviewPrompt).toContain('platform_checks')
    expect(reviewPrompt).toContain('rubric_source')
    expect(reviewPrompt).toContain('Rubric: fanqie | qidian | zhihu | generic web-fiction')
    expect(revisionPrompt).toContain('platform_checks')
    expect(revisionPrompt).toContain('平台不匹配')
    expect(reviewNormalizeBlock).toContain('platform_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.platform_checks')
    expect(reviewNormalizeBlock).toContain('rubric_source')
  })

  test('asks prose self review and revision to enforce content rubric checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedDeslopChecks = ['),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedDeslopChecks = [')),
    )

    expect(reviewPrompt).toContain('chapter_target.content_rubric')
    expect(reviewPrompt).toContain('content_rubric_checks')
    expect(reviewPrompt).toContain('黄金三问')
    expect(revisionPrompt).toContain('content_rubric_checks')
    expect(revisionPrompt).toContain('内容基准')
    expect(reviewNormalizeBlock).toContain('content_rubric_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.content_rubric_checks')
  })

  test('asks prose self review and revision to use oh-story adversarial perspectives', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )
    const reviewNormalizeSetupBlock = source.slice(
      source.indexOf('const preDraftReceiptChecks ='),
      source.indexOf('const normalizedReview = {', source.indexOf('const preDraftReceiptChecks =')),
    )

    expect(reviewPrompt).toContain('perspective_verdicts')
    expect(reviewPrompt).toContain('story-architect')
    expect(reviewPrompt).toContain('character-designer')
    expect(reviewPrompt).toContain('narrative-writer')
    expect(reviewPrompt).toContain('consistency-checker')
    expect(revisionPrompt).toContain('perspective_verdicts')
    expect(revisionPrompt).toContain('多视角审查')
    expect(shouldReviseBlock).toContain('perspective_verdicts')
    expect(reviewNormalizeBlock).toContain('perspective_verdicts')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.perspective_verdicts')
  })

  test('asks prose self review and revision to enforce oh-story deslop gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedDeslopChecks = ['),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedDeslopChecks = [')),
    )

    expect(reviewPrompt).toContain('deslop_checks')
    expect(reviewPrompt).toContain('Gate A-G')
    expect(reviewPrompt).toContain('模式 8')
    expect(reviewPrompt).toContain('解释腔/上帝视角/安排感')
    expect(revisionPrompt).toContain('deslop_checks')
    expect(revisionPrompt).toContain('deslop_gate_diagnostics')
    expect(revisionPrompt).toContain('concern_gate_count')
    expect(revisionPrompt).toContain('summary/gates/evidence/fix')
    expect(revisionPrompt).toContain('deslop_repair_receipts')
    expect(revisionPrompt).toContain('去AI味')
    expect(shouldReviseBlock).toContain('deslop_checks')
    expect(shouldReviseBlock).toContain('deslop_gate_diagnostics')
    expect(shouldReviseBlock).toContain('concern_gate_count')
    expect(reviewNormalizeBlock).toContain('deslop_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.deslop_checks')
    expect(reviewNormalizeBlock).toContain('deslop_gate_diagnostics')
  })

  test('scans oh-story banned words into deslop gate checks', () => {
    const hits = scanBannedWordLeaks('他不是冷漠，而是绝望。她缓缓抬头，眼中闪过一丝迟疑。')

    expect(hits.map((item: any) => item.pattern).join('｜')).toContain('不是A，而是B')
    expect(hits.map((item: any) => item.pattern).join('｜')).toContain('缓缓')
    expect(hits.map((item: any) => item.pattern).join('｜')).toContain('眼中闪过')
    expect(hits[0].gate).toBe('A')
    expect(hits[0].status).toBe('fail')
    expect(hits[0].fix).toContain('直接写')
  })

  test('scans cross-line negative-positive AI pattern variants into deslop gate checks', () => {
    const hits = scanBannedWordLeaks([
      '他不是害怕。',
      '而是听见门缝里有人倒着念他的名字。',
      '林青禾不是犹豫',
      '是袖口里的旧印正在发烫。',
    ].join('\n'))

    expect(hits.filter((item: any) => item.pattern === '不是A，而是B')).toHaveLength(2)
    expect(hits[0].evidence).toContain('他不是害怕')
    expect(hits[0].evidence).toContain('而是听见')
    expect(hits[1].evidence).toContain('林青禾不是犹豫')
    expect(hits[1].evidence).toContain('是袖口里的旧印')
    expect(hits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('does not flag oh-story negative-positive false-positive variants', () => {
    const hits = scanBannedWordLeaks([
      '门外的声音不是敲门就是抓墙。',
      '他低声问：“你是不是听见它在叫你，是吗？”',
      '那不是雨声，也不是风声。',
    ].join('\n'))

    expect(hits.some((item: any) => item.pattern === '不是A，而是B')).toBe(false)
  })

  test('scans three-part cross-line negative-positive AI pattern variants into deslop gate checks', () => {
    const hits = scanBannedWordLeaks([
      '那不是普通水迹。',
      '也不是屋檐滴水。',
      '而是墙内有人倒着呼吸。',
    ].join('\n'))

    const patternHits = hits.filter((item: any) => item.pattern === '不是A，不是B，而是C')
    expect(patternHits).toHaveLength(1)
    expect(patternHits[0].evidence).toContain('那不是普通水迹')
    expect(patternHits[0].evidence).toContain('也不是屋檐滴水')
    expect(patternHits[0].evidence).toContain('而是墙内有人倒着呼吸')
    expect(patternHits[0].status).toBe('fail')
    expect(patternHits[0].fix).toContain('直接写最终事实')
  })

  test('scans cross-line contrast template AI pattern variants into deslop gate checks', () => {
    const hits = scanBannedWordLeaks([
      '与其说他是在退让。',
      '不如说他在等门后的脚步声靠近。',
      '那张名单看似普通。',
      '实则每一行都在倒着改名。',
    ].join('\n'))

    expect(hits.some((item: any) => item.pattern === '与其说A，不如说B' && item.evidence.includes('不如说他在等'))).toBe(true)
    expect(hits.some((item: any) => item.pattern === '看似A，实则B' && item.evidence.includes('实则每一行'))).toBe(true)
    expect(hits.filter((item: any) => item.status === 'fail')).toHaveLength(2)
  })

  test('scans remaining oh-story mode one AI signature words into Gate A', () => {
    const hits = scanBannedWordLeaks([
      '只见走廊尽头的名单映入眼帘。',
      '此时此刻，管理员目光如炬。',
      '他沉声道：“别动。”',
      '她脸色一变，嘴角微扬。',
    ].join('\n'))

    const patterns = hits.map((item: any) => item.pattern)
    expect(patterns).toEqual(expect.arrayContaining([
      '只见',
      '映入眼帘',
      '此时此刻',
      '目光如炬',
      '沉声道',
      '脸色一变',
      '嘴角微扬',
    ]))
    expect(hits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(hits.map((item: any) => item.fix).join('｜')).toContain('具体')
  })

  test('scans universal metaphor phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '压力像潮水般涌上来，挤得他喘不过气。',
      '那枚旧印像命运的齿轮，终于开始转动。',
      '管理员扣住他的手腕，力道大得像是要把骨头捏碎。',
      '他蹲在门边，像一头被抛弃的野狗。',
      '她脸色惨白得像这漫天的雪。',
      '她哭得梨花带雨，所有人都沉默下来。',
      '长老一句话说完，厅里众人如沐春风。',
      '他像平时一样把钥匙放回柜台。',
    ].join('\n'))

    const universalMetaphors = hits.filter((item: any) => item.pattern === '万能比喻')
    expect(universalMetaphors).toHaveLength(7)
    expect(universalMetaphors[0].evidence).toContain('像潮水般')
    expect(universalMetaphors[1].evidence).toContain('像命运的齿轮')
    expect(universalMetaphors[2].evidence).toContain('像是要把骨头捏碎')
    expect(universalMetaphors[3].evidence).toContain('像一头被抛弃的野狗')
    expect(universalMetaphors[4].evidence).toContain('像这漫天的雪')
    expect(universalMetaphors[5].evidence).toContain('梨花带雨')
    expect(universalMetaphors[6].evidence).toContain('如沐春风')
    expect(universalMetaphors.every((item: any) => item.gate === 'A')).toBe(true)
    expect(universalMetaphors.map((item: any) => item.fix).join('｜')).toContain('白描')
    expect(hits.some((item: any) => item.evidence.includes('像平时一样'))).toBe(false)
  })

  test('scans summary realization phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '他终于明白，管理员从第一夜就在筛选学生。',
      '她这才意识到，账本最后一页不是欠款。',
      '此刻，他再也没有退路。',
      '一切证词都指向门后的第四个人。',
      '原来名单从第一夜就在筛选他。',
      '这就是规则塔真正的入口。',
      '“原来你在这里。”林青禾把伞递过去。',
    ].join('\n'))

    const summaryHits = hits.filter((item: any) => item.pattern === '总结句式')
    expect(summaryHits).toHaveLength(6)
    expect(summaryHits[0].evidence).toContain('终于明白')
    expect(summaryHits[1].evidence).toContain('这才意识到')
    expect(summaryHits[2].evidence).toContain('此刻')
    expect(summaryHits[3].evidence).toContain('一切证词都')
    expect(summaryHits[4].evidence).toContain('原来名单')
    expect(summaryHits[5].evidence).toContain('这就是规则塔')
    expect(summaryHits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(summaryHits.map((item: any) => item.fix).join('｜')).toContain('现场证据')
    expect(hits.some((item: any) => item.evidence.includes('原来你在这里'))).toBe(false)
  })

  test('scans this-moment elevation phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '这一刻，所有人都相信未来可期。',
      '这一刻，门后的名单终于露出第四个名字。',
      '“就这一刻。”林青禾把钥匙按进锁孔。',
    ].join('\n'))

    const summaryHits = hits.filter((item: any) => item.pattern === '总结句式')
    expect(summaryHits).toHaveLength(2)
    expect(summaryHits[0].evidence).toContain('这一刻，所有人')
    expect(summaryHits[1].evidence).toContain('这一刻，门后的名单')
    expect(summaryHits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(summaryHits.map((item: any) => item.fix).join('｜')).toContain('现场证据')
    expect(hits.some((item: any) => item.evidence.includes('就这一刻'))).toBe(false)
  })

})
