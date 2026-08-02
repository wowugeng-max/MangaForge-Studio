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
} from '../novel-writing-service'
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
    'prose-quality-risks-extended-core.ts',
    'prose-quality-risks-extended-handoff.ts',
    'prose-quality-risks-extended-audience.ts',
    'prose-quality-risks-audience.ts',
    'prose-quality-risks-audience-core.ts',
    'prose-quality-risks-audience-hooks.ts',
    'prose-quality-risks-audience-craft.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('chapter context word-target b a', () => {
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

})
