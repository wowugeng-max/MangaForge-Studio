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

test('keeps the connected draft with warnings when a quality revision drops the opening handoff', async () => {
  const initialDraft = buildPipelineProse(
    '倒数压到最后三秒，江澈停在围墙阴影里等待。',
    '只看着追捕队继续收紧包围',
  )
  const firstRevision = buildPipelineProse(
    '倒数压到最后三秒，江澈仍在围墙阴影里，却终于离开墙角。',
    '跟着顾遥留下的手势挪动，没有改变封锁结构',
  )
  const secondRevision = buildPipelineProse(
    '第二轮改稿里，江澈抢到耳机，却仍等着顾遥下令。',
    '守在原地听取指令，没有主动争取出口',
  )
  const failedReview = (evidence: string) => ({
    score: 72,
    dimensions: proseQualityScores,
    findings: [{
      key: 'agency',
      severity: 'S2',
      dimension: 'core_promise_agency',
      evidence,
      required_change: '让江澈主动破围并改变追捕阵型',
      acceptance_test: '追捕阵型因江澈的可见动作发生变化',
    }],
  })
  const unexpectedThirdReview = {
    get score(): never {
      throw new Error('quality review exceeded the single recheck budget')
    },
    publishable: true,
    dimensions: { ...proseQualityScores, core_promise_agency: 10 },
    findings: [],
  }
  const harness = await createProsePipelineHarness({
    reviewPayloads: [
      failedReview('倒数压到最后三秒，江澈停在围墙阴影里等待。'),
      failedReview('倒数压到最后三秒，江澈仍在围墙阴影里，却终于离开墙角。'),
      unexpectedThirdReview,
    ],
    revisionTexts: [firstRevision, secondRevision],
  })

  const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
    model_id: 217,
    target_word_count: 1000,
    quality_threshold: 78,
    auto_repair_quality_gate: true,
  })

  expect(result).toMatchObject({
    admission_status: 'accepted_with_warnings',
    quality_loop: {
      decision: { passed: false },
    },
  })
  expect(result.quality_loop?.rounds).toContainEqual(expect.objectContaining({
    round: 1,
    accepted: false,
    reason: expect.stringContaining('承接'),
  }))
  expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'quality' }))
  expect(result.prompt_diagnostics?.prompt_chars).toBeGreaterThan(0)
  expect(JSON.stringify(result.quality_loop)).not.toContain(firstRevision.slice(0, 80))
  expect(JSON.stringify(result.quality_loop)).not.toContain(secondRevision.slice(0, 80))

  const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
  expect(stored?.chapter_text).toBe(normalizeProseForStorage(initialDraft))
  expect(harness.storeCalls).toBe(1)
  expect(harness.storyStateCalls).toBe(1)
  expect(harness.memoryTexts).toEqual([normalizeProseForStorage(initialDraft)])
  expect(harness.modelCalls.review).toBe(1)
  expect(harness.modelCalls.revision).toBe(1)
})
test('stores revised prose with warnings when the independent quality recheck is unavailable', async () => {
  const revisedText = buildPipelineProse(
    '江澈撞断路灯，第一排追兵被飞石逼离封锁位。',
    '沿着自己砸出的缺口向前压进，迫使追捕队改变阵型',
  )
  const harness = await createProsePipelineHarness({
    reviewPayloads: [{
      score: 70,
      dimensions: proseQualityScores,
      findings: [{
        key: 'hook',
        severity: 'S2',
        dimension: 'payoff_hook',
        evidence: '倒数压到最后三秒，江澈停在围墙阴影里等待。',
        required_change: '补足本章回报和章末新问题',
        acceptance_test: '末段形成具体翻页理由',
      }],
    }],
    revisionTexts: [revisedText],
    recheckError: new Error('review timeout'),
  })

  const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
    model_id: 217,
    target_word_count: 1000,
    quality_threshold: 78,
    auto_repair_quality_gate: true,
    approvals: { quality_gate: { approved: true } },
  })

  expect(result).toMatchObject({
    admission_status: 'accepted_with_warnings',
    quality_loop: {
      decision: {
        passed: false,
        hard_failures: [],
      },
      rounds: [{ round: 1, accepted: true, reason: '' }],
    },
  })
  expect(result.quality_loop.decision.advisory_failures.join('｜')).toContain('quality_recheck_unavailable')
  expect(result.quality_warnings).toContainEqual(expect.objectContaining({ code: 'quality_recheck_unavailable', source: 'review' }))
  expect(result.prompt_diagnostics?.prompt_chars).toBeGreaterThan(0)
  expect(JSON.stringify(result.quality_loop)).not.toContain(revisedText.slice(0, 80))

  expect(harness.storeCalls).toBe(1)
  expect(harness.storyStateCalls).toBe(1)
  const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
  expect(stored?.chapter_text).toBe(normalizeProseForStorage(revisedText))
})
test('stores one coherent final prose text after a passing independent recheck', async () => {
  const originalDraft = buildPipelineProse(
    '倒数压到最后三秒，江澈停在围墙阴影里等待。',
    '只看着追捕队继续收紧包围',
  )
  const finalText = normalizeProseForStorage(buildPipelineProse(
    '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
    '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
  ))
  const harness = await createProsePipelineHarness({
    draftText: originalDraft,
    reviewPayloads: [
      {
        score: 72,
        dimensions: proseQualityScores,
        findings: [{
          key: 'agency',
          severity: 'S2',
          dimension: 'core_promise_agency',
          evidence: '倒数压到最后三秒，江澈停在围墙阴影里等待。',
          required_change: '让江澈主动破围',
          acceptance_test: '追捕阵型因主角动作改变',
        }],
      },
      {
        score: 88,
        publishable: true,
        dimensions: { ...proseQualityScores, core_promise_agency: 9, payoff_hook: 9 },
        findings: [],
      },
    ],
    revisionTexts: [finalText],
  })

  const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
    model_id: 217,
    target_word_count: 1000,
    quality_threshold: 78,
    auto_repair_quality_gate: true,
  })
  const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
  const versions = await listChapterVersions(harness.workspace, harness.chapter.id)

  expect(stored?.chapter_text).toBe(finalText)
  expect(versions[0]?.source).toBe('repair')
  expect(stored?.raw_payload?.oh_story_director).toEqual(result.post_draft_director)
  expect(stored?.raw_payload?.oh_story_delivery_receipts).toEqual(result.oh_story_delivery_receipts)
  expect(harness.storyStateTexts).toEqual([finalText])
  expect(harness.memoryTexts).toEqual([finalText])
  expect(harness.memoryTexts).not.toContain(originalDraft)
  expect(harness.draftOptions).toEqual([expect.objectContaining({ skipMemoryStore: true })])
  expect(result.quality_loop.decision.passed).toBe(true)
  expect(result.quality_loop.rounds).toEqual([{ round: 1, accepted: true, reason: '' }])
})
test('stores valid prose with warnings for subjective quality failures in every prose storage production mode', async () => {
  const originalDraft = buildPipelineProse(
    '倒数压到最后三秒，江澈停在围墙阴影里等待。',
    '只看着追捕队继续收紧包围',
  )
  const revisedDraft = buildPipelineProse(
    '江澈撞断路灯，飞石逼退第一排追兵，铁门前露出缺口。',
    '沿自己制造的盲区夺下通讯器并迫使追捕队改变阵型',
  )
  const failedReview = (evidence: string) => ({
    score: 72,
    dimensions: proseQualityScores,
    findings: [{
      key: 'agency',
      severity: 'S2',
      dimension: 'core_promise_agency',
      evidence,
      required_change: '让江澈主动改变包围结构',
      acceptance_test: '追捕阵型因江澈动作改变',
    }],
  })
  for (const productionMode of ['draft_only', 'draft_review', 'draft_review_revise_store']) {
    const harness = await createProsePipelineHarness({
      draftText: originalDraft,
      reviewPayloads: [
        failedReview('倒数压到最后三秒，江澈停在围墙阴影里等待。'),
        failedReview('江澈撞断路灯，飞石逼退第一排追兵。'),
      ],
      revisionTexts: [revisedDraft],
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      quality_threshold: 78,
      production_mode: productionMode,
      approvals: { quality_gate: { approved: true } },
    })

    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'quality' }))
    expect(harness.storeCalls).toBe(1)
    const expectedFinalText = normalizeProseForStorage(
      productionMode === 'draft_review_revise_store' ? revisedDraft : originalDraft,
    )
    const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
    expect(result.chapter?.chapter_text).toBe(expectedFinalText)
    expect(stored?.chapter_text).toBe(expectedFinalText)
    if (productionMode === 'draft_review_revise_store') {
      expect(harness.storyStateCalls).toBe(1)
      expect(harness.storyStateTexts).toEqual([expectedFinalText])
      expect(harness.memoryTexts).toEqual([expectedFinalText])
    } else {
      expect(harness.storyStateCalls).toBe(0)
      expect(harness.storyStateTexts).toEqual([])
      expect(harness.memoryTexts).toEqual([])
    }
  }
})
test('uses the injected writing runtime for service model calls', async () => {
  const calls: any[] = []
  const service = createNovelWritingService({
    getProject: async () => null,
    production: {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    } as any,
    reference: {} as any,
    runtime: {
      executeAgent: async (...args: any[]) => {
        calls.push(args)
        return {
          parsed: {
            chapter_text: '江澈抬手截住落下的铁门，追兵的脚步被迫分成两路。',
            editor_report: { passed: true },
          },
          modelName: 'fake-editor',
        }
      },
    },
  } as any)

  const result = await service.runCommercialEditorRewrite(
    '/tmp/mangaforge-runtime-injection',
    { title: '怪谈世界' },
    { chapter_target: { word_target: { target: 1000, min: 800, max: 1100 } } },
    '江澈站在封锁线前。',
    217,
  )

  expect(calls).toHaveLength(1)
  expect(result.final_text).toContain('截住落下的铁门')
  expect(result.editor_report.modelName).toBe('fake-editor')
})
test('uses the injected chapter context before enforcing request launch gates', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-runtime-context-'))
  const project = await createNovelProject(workspace, {
    title: '怪谈世界',
    genre: '规则怪谈',
    synopsis: '江澈在追捕中主动破局。',
    reference_config: {},
  })
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 10,
    title: '合围',
    chapter_goal: '江澈主动打穿追捕圈。',
    chapter_summary: '追捕队从四面合围。',
    conflict: '出口全部被封死。',
    ending_hook: '幕后指挥者第一次开口。',
    scene_list: [{ scene_no: 1, title: '破围', purpose: '打穿封锁', conflict: '双层追捕线' }],
  })
  let contextCalls = 0
  let modelCalls = 0
  const service = createNovelWritingService({
    getProject: async () => project,
    production: {
      buildAgentConfigSnapshot: () => ({}),
      getApprovalPolicy: () => ({}),
    } as any,
    reference: {} as any,
    runtime: {
      buildChapterContext: async () => {
        contextCalls += 1
        return {
          preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
          chapter_target: {
            id: chapter.id,
            chapter_no: 10,
            title: chapter.title,
            goal: chapter.chapter_goal,
            summary: chapter.chapter_summary,
            conflict: chapter.conflict,
            ending_hook: chapter.ending_hook,
            scene_cards: chapter.scene_list,
          },
        }
      },
      generateChapterProse: async () => {
        modelCalls += 1
        return { parsed: { chapter_text: '不应生成。' } } as any
      },
      executeAgent: async () => {
        modelCalls += 1
        return { parsed: {} } as any
      },
    },
  })

  await expect(service.generateChapterForGroup(workspace, project.id, chapter.id, {
    model_id: 217,
    allow_incomplete: true,
    chapter_launch_gate: { status: 'blocked', summary: '第九章合围承接项缺失' },
  })).rejects.toMatchObject({ code: 'PROSE_LAUNCH_GATE_BLOCKED' })

  expect(contextCalls).toBe(1)
  expect(modelCalls).toBe(0)
})
test('rolls back material repair before blocking a still-missing strict preflight', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-runtime-strict-repair-'))
  const project = await createNovelProject(workspace, {
    title: '怪谈世界',
    genre: '规则怪谈',
    synopsis: '江澈在追捕中主动破局。',
    reference_config: {},
  })
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 10,
    title: '合围',
    chapter_goal: '江澈主动打穿追捕圈。',
    chapter_summary: '追捕队从四面合围。',
    conflict: '出口全部被封死。',
    ending_hook: '幕后指挥者第一次开口。',
    scene_list: [{ scene_no: 1, title: '破围', purpose: '打穿封锁', conflict: '双层追捕线' }],
  })
  const stages: Array<{ stage: string; payload: any }> = []
  let contextCalls = 0
  let draftCalls = 0
  let modelCalls = 0
  const service = createNovelWritingService({
    getProject: async () => project,
    production: {
      buildAgentConfigSnapshot: () => ({}),
      getApprovalPolicy: () => ({}),
    } as any,
    reference: {} as any,
    runtime: {
      buildChapterContext: async () => {
        contextCalls += 1
        return {
          preflight: {
            ready: true,
            checks: [{ key: 'chapter_blueprint', ok: false, severity: 'high' }],
            warnings: ['本章蓝图缺失'],
            blockers: [],
          },
          chapter_target: {
            id: chapter.id,
            chapter_no: chapter.chapter_no,
            title: chapter.title,
            goal: chapter.chapter_goal,
            summary: chapter.chapter_summary,
            conflict: chapter.conflict,
            ending_hook: chapter.ending_hook,
            scene_cards: chapter.scene_list,
          },
        }
      },
      generateChapterProse: async () => {
        draftCalls += 1
        return { parsed: { chapter_text: '不应生成。' } } as any
      },
      executeAgent: async () => {
        modelCalls += 1
        return { parsed: {} } as any
      },
    },
  })

  const snapshot = async () => JSON.stringify({
      chapters: await listNovelChapters(workspace, project.id),
      characters: await listNovelCharacters(workspace, project.id),
      outlines: await listNovelOutlines(workspace, project.id),
      reviews: await listNovelReviews(workspace, project.id),
      worldbuilding: await listNovelWorldbuilding(workspace, project.id),
    })
  const before = await snapshot()
  const snapshotsDuringRepair: string[] = []

  const error = await service.generateChapterForGroup(workspace, project.id, chapter.id, {
    auto_repair_missing_material: true,
    onStage: async (stage: string, payload: any) => {
      stages.push({ stage, payload })
      if (stage === 'material_repair' && payload?.status === 'warn') snapshotsDuringRepair.push(await snapshot())
    },
  }).then(() => null, (caught: any) => caught)

  expect(error).toBeTruthy()
  expect(contextCalls).toBe(2)
  expect(stages.filter(item => item.stage === 'material_repair').map(item => item.payload.status))
    .toEqual(['running', 'warn'])
  const materialRepairResult = stages.find(item => item.stage === 'material_repair' && item.payload.status === 'warn')
  expect(materialRepairResult?.payload.repaired).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'chapter_blueprint_updated', chapter_id: chapter.id }),
  ]))
  const after = await snapshot()
  expect(snapshotsDuringRepair).toEqual([before])
  expect(after).toBe(before)
  expect(stages.find(item => item.stage === 'context')?.payload.status).toBe('failed')
  expect(stages.at(-1)).toMatchObject({
    stage: 'context',
    payload: { status: 'failed' },
  })
  expect(draftCalls).toBe(0)
  expect(modelCalls).toBe(0)
})
test('recomputes director after request merge and blocks before draft invocation', async () => {
  let draftCalls = 0
  const prepared = prepareProseGenerationContract(
    {
      chapter_target: { chapter_no: 10, scene_cards: [{ scene_no: 1 }] },
      preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
    },
    {
      chapter_launch_gate: { status: 'blocked', summary: '第九章追捕合围未承接' },
      allow_incomplete: true,
    },
  )

  await expect(prepared.runAfterGate(async () => {
    draftCalls += 1
    return 'drafted'
  })).rejects.toMatchObject({ code: 'PROSE_LAUNCH_GATE_BLOCKED' })

  expect(draftCalls).toBe(0)
  expect(prepared.contract.context.chapter_target.chapter_launch_gate.status).toBe('blocked')
  expect(prepared.contract.director.readiness).toBe('ready')
})
test('rebuilds the generation contract at every chapter-group context boundary', () => {
  const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
  const groupStart = source.indexOf('const generateChapterForGroup = async')
  const groupEnd = source.indexOf('\n  return {', groupStart)
  const groupBlock = source.slice(groupStart, groupEnd)
  const preparationCalls = groupBlock.match(/prepareProseGenerationContract\(/g) || []

  expect(groupStart).toBeGreaterThanOrEqual(0)
  expect(preparationCalls.length).toBeGreaterThanOrEqual(3)
  expect(groupBlock).toContain('runAfterGate')
  expect(groupBlock).toContain('generationContract')
  expect(groupBlock).not.toContain("!contextPackage.preflight.ready && options.allow_incomplete !== true")
  expect(groupBlock).not.toContain('launchGateBlocker && options.allow_incomplete !== true')
  expect(groupBlock).not.toContain("!contextPackage.chapter_target.scene_cards.length && options.allow_incomplete !== true")
})
test('compiles the prose prompt from required core sections and director-selected contracts', () => {
  const contract = buildProseGenerationContract({
    chapter_target: {
      chapter_no: 10,
      title: '合围破局',
      goal: '江澈主动打穿追捕圈',
      summary: '承接追捕合围并取得线索',
      conflict: '追捕队封死四面出口',
      reader_payoff: 'CHAPTER_PAYOFF_SENTINEL：夺取追捕频道反向锁定敌人',
      ending_hook: '幕后指挥者第一次现身',
      previous_handoff: 'HANDOFF_SENTINEL：追兵从四面封死巷口。',
      word_target: { target: 3200, min: 2800, max: 3800 },
      scene_cards: [{
        scene_no: 1,
        title: '破围',
        goal: 'SCENE_CAUSALITY_SENTINEL：夺下追捕队通讯器',
        obstacle: '两层封锁线互相掩护',
        action: 'SCENE_ACTION_SENTINEL：江澈撞进第二层封锁线',
        turn: 'SCENE_TURN_SENTINEL：通讯器里传来熟人的声音',
        payoff: 'SCENE_PAYOFF_SENTINEL：夺到幕后指挥频道',
        state_delta: 'SCENE_STATE_DELTA_SENTINEL：追捕方失去统一指挥',
        protagonist_agency_action: '江澈主动砸断路灯制造盲区',
        event_value_change: '追捕方失去统一指挥',
      }],
      core_contract_radar: {
        reader_promise: 'CORE_PROMISE_SENTINEL：超人以行动碾碎怪谈规则',
        core_conflict: '人的选择对抗怪谈规则',
      },
      longform_compass: {
        reader_promise: 'REQUEST_COMPASS_SENTINEL：每章都由江澈主动破局',
        no_drift: ['主角不能等待配角代办结果'],
      },
      next_batch_brief: {
        current_chapter_role: 'REQUEST_BATCH_ROLE_SENTINEL：本章打穿合围并拿到频道',
      },
      delivery_risk_carry_over: {
        opening_actions: ['REQUEST_DELIVERY_RISK_SENTINEL：前300字承接追兵封巷'],
      },
      million_word_runway: {
        mode: 'single_chapter',
        red_lines: ['REQUEST_RUNWAY_SENTINEL：不得提前解决幕后组织'],
      },
      dialogue_contract: {
        dialogue_goals: ['SELECTED_DIALOGUE_SENTINEL：逼出幕后指挥者身份'],
      },
      quality_audit_contract: {
        chapter_focus: ['UNSELECTED_QUALITY_SENTINEL'],
      },
    },
    preflight: { ready: true, strict_ready: true, checks: [], blockers: [], warnings: [] },
    oh_story_director: {
      readiness: 'ready',
      selected_contracts: [{ key: 'dialogue_contract', detail_level: 'full', reason: '对白风险' }],
    },
  })

  const compiled = compileParagraphProseContext({ title: '怪谈世界' }, contract)

  expect(compiled.prompt.length).toBeLessThanOrEqual(48_000)
  expect(compiled.prompt).toContain('HANDOFF_SENTINEL')
  expect(compiled.prompt).toContain('SCENE_CAUSALITY_SENTINEL')
  expect(compiled.prompt).toContain('SCENE_ACTION_SENTINEL')
  expect(compiled.prompt).toContain('SCENE_TURN_SENTINEL')
  expect(compiled.prompt).toContain('SCENE_PAYOFF_SENTINEL')
  expect(compiled.prompt).toContain('SCENE_STATE_DELTA_SENTINEL')
  expect(compiled.prompt).toContain('CORE_PROMISE_SENTINEL')
  expect(compiled.prompt).toContain('CHAPTER_PAYOFF_SENTINEL')
  expect(compiled.prompt).toContain('REQUEST_COMPASS_SENTINEL')
  expect(compiled.prompt).toContain('REQUEST_BATCH_ROLE_SENTINEL')
  expect(compiled.prompt).toContain('REQUEST_DELIVERY_RISK_SENTINEL')
  expect(compiled.prompt).toContain('REQUEST_RUNWAY_SENTINEL')
  expect(compiled.prompt).toContain('SELECTED_DIALOGUE_SENTINEL')
  expect(compiled.prompt).not.toContain('UNSELECTED_QUALITY_SENTINEL')
  expect(compiled.diagnostics.selected_contract_keys).toEqual(['dialogue'])
  expect(compiled.diagnostics.omitted_contract_keys).toContain('quality_audit')
  expect(compiled.diagnostics.prompt_chars).toBe(compiled.prompt.length)
})
test('uses the compiled generation contract for the actual draft runtime call', () => {
  const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
  const groupStart = source.indexOf('const generateChapterForGroup = async')
  const draftCallStart = source.indexOf('const draftResult = await generateNovelChapterProse', groupStart)
  const draftCallEnd = source.indexOf('const resultPayload = getNovelPayload', draftCallStart)
  const draftCallBlock = source.slice(groupStart, draftCallEnd)

  expect(groupStart).toBeGreaterThanOrEqual(0)
  expect(draftCallStart).toBeGreaterThan(groupStart)
  expect(draftCallEnd).toBeGreaterThan(draftCallStart)
  expect(draftCallBlock).toContain('const compiledPrompt = compileParagraphProseContext(project, generationContract, migrationPlan, chapter)')
  expect(draftCallBlock).toContain("onStage('draft', { status: 'running', prompt_diagnostics: compiledPrompt.diagnostics })")
  expect(draftCallBlock).toContain('paragraphTask: compiledPrompt.prompt')
  expect(draftCallBlock).toContain('promptDiagnostics: compiledPrompt.diagnostics')
  expect(draftCallBlock).toContain('boundedProseContract: true')
  expect(draftCallBlock).toContain('const draftPromptDiagnostics =')
  expect(draftCallBlock).not.toContain('paragraphTask: buildParagraphProseContext(project, contextPackage')
  expect(source.slice(draftCallStart).match(/prompt_diagnostics: draftPromptDiagnostics/g)?.length || 0).toBeGreaterThanOrEqual(3)
})
