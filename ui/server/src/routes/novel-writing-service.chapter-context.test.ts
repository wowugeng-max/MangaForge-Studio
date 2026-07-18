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


describe('chapter context word target source guards', () => {
  test('blocks prose preflight when benchmark recall has hard setup gaps', () => {
    const preflight = buildPreflightChecks(
      { title: '门禁测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角拿到关键证据并逼出反派破绽。',
        chapter_summary: '主角用旧账册制造信息差。',
        conflict: '反派试图否认旧账册的真实性。',
        ending_hook: '反派背后的人露出名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              gaps: ['missing_primary_contract'],
            },
          },
        },
      },
      null,
      [{ world_summary: '核心规则完整。' }],
      [{ name: '林照', current_state: { location: '公堂' } }],
      [{ scene_no: 1, goal: '对峙' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(false)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_gate')).toBe(true)
    expect(preflight.warnings.join('｜')).toContain('文风召回门禁')
  })

  test('blocks prose preflight when v12 benchmark recall is missing canonical module or rhythm', () => {
    const preflight = buildPreflightChecks(
      { title: '模块门禁测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角用证据反杀执事。',
        chapter_summary: '主角在审判庭公开旧账册。',
        conflict: '执事试图把账册说成伪造。',
        ending_hook: '旧账册背面浮出第二个名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              gaps: ['module_missing', 'rhythm_missing'],
            },
          },
        },
      },
      null,
      [{ world_summary: '宗门审判规则完整。' }],
      [{ name: '李玄', current_state: { location: '审判庭' } }],
      [{ scene_no: 1, goal: '公开旧账册' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(false)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_gate')).toBe(true)
    expect(preflight.warnings.join('｜')).toContain('module_missing')
    expect(preflight.warnings.join('｜')).toContain('rhythm_missing')
  })

  test('keeps legacy benchmark recall module and rhythm gaps as soft carry-over warnings', () => {
    const preflight = buildPreflightChecks(
      { title: '旧拆文回退测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角用证据反杀执事。',
        chapter_summary: '主角在审判庭公开旧账册。',
        conflict: '执事试图把账册说成伪造。',
        ending_hook: '旧账册背面浮出第二个名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              gaps: ['legacy_deconstruction', 'module_missing', 'rhythm_missing'],
            },
          },
        },
      },
      null,
      [{ world_summary: '宗门审判规则完整。' }],
      [{ name: '李玄', current_state: { location: '审判庭' } }],
      [{ scene_no: 1, goal: '公开旧账册' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(true)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_gate')).toBe(false)
    expect(preflight.checks.some((item: any) => item.key === 'benchmark_recall_gaps')).toBe(true)
    expect(preflight.warnings.join('｜')).toContain('legacy_deconstruction')
  })

  test('does not block benchmark preflight when no benchmark project is configured', () => {
    const preflight = buildPreflightChecks(
      { title: '无对标项目测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角用证据反杀执事。',
        chapter_summary: '主角在审判庭公开旧账册。',
        conflict: '执事试图把账册说成伪造。',
        ending_hook: '旧账册背面浮出第二个名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              gaps: ['no_benchmark', 'module_missing', 'rhythm_missing', 'profile_missing'],
            },
          },
        },
      },
      null,
      [{ world_summary: '宗门审判规则完整。' }],
      [{ name: '李玄', current_state: { location: '审判庭' } }],
      [{ scene_no: 1, goal: '公开旧账册' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(true)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_gate')).toBe(false)
    expect(preflight.checks.some((item: any) => item.key === 'benchmark_recall_gaps')).toBe(false)
    expect(preflight.warnings.join('｜')).not.toContain('module_missing')
  })

  test('warns when benchmark recall has no concrete source paths', () => {
    const preflight = buildPreflightChecks(
      { title: '召回来源测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角用证据反杀执事。',
        chapter_summary: '主角在审判庭公开旧账册。',
        conflict: '执事试图把账册说成伪造。',
        ending_hook: '旧账册背面浮出第二个名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              source: 'oh_story_workflow_daily_step_2_3',
              selected_emotion_module: 'M03 信息差反杀',
              rhythm_reference: '先压三轮质问，再用证据爆发。',
              style_profile_summary: '短句推进审讯压力，对白留半拍。',
              matched_chapter_techniques: ['三轮压问', '半拍亮证据'],
            },
          },
        },
      },
      null,
      [{ world_summary: '宗门审判规则完整。' }],
      [{ name: '李玄', current_state: { location: '审判庭' } }],
      [{ scene_no: 1, goal: '公开旧账册' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(true)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_source_paths')).toBe(false)
    expect(preflight.checks.some((item: any) => item.key === 'benchmark_recall_source_paths')).toBe(true)
    expect(preflight.warnings.join('｜')).toContain('source_paths')
    expect(preflight.warnings.join('｜')).toContain('Step 2.3')
  })

  test('rechecks benchmark recall preflight after confirmed context is merged', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const contextStart = source.indexOf('export async function buildChapterContextPackage')
    const mergeStart = source.indexOf('const confirmedPackage = mergeConfirmedPreDraftBriefIntoContext', contextStart)
    const overrideStart = source.indexOf('const override = chapter.raw_payload?.context_package_override', mergeStart)
    const mergeBlock = source.slice(mergeStart, overrideStart)

    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(mergeStart).toBeGreaterThan(contextStart)
    expect(mergeBlock).toContain('buildBenchmarkRecallBrief(confirmedPackage')
    expect(mergeBlock).toContain('applyBenchmarkRecallPreflightChecks')
  })

  test('rechecks source readiness preflight after confirmed context is merged', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const contextStart = source.indexOf('export async function buildChapterContextPackage')
    const mergeStart = source.indexOf('const confirmedPackage = mergeConfirmedPreDraftBriefIntoContext', contextStart)
    const overrideStart = source.indexOf('const override = chapter.raw_payload?.context_package_override', mergeStart)
    const mergeBlock = source.slice(mergeStart, overrideStart)

    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(mergeStart).toBeGreaterThan(contextStart)
    expect(mergeBlock).toContain('applySourceReadinessPreflightChecks')
    expect(mergeBlock).toContain('state_tracking_contract')
  })

  test('declares word target inside chapter context builder instead of writing bible builder', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const bibleSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/writing-bible.ts'), 'utf8')
    const bibleStart = bibleSource.indexOf('export function buildWritingBible')
    const bibleEnd = bibleSource.indexOf('export function hasMeaningfulWritingBible', bibleStart)
    const contextStart = source.indexOf('export async function buildChapterContextPackage')
    const basePackageStart = source.indexOf('const basePackage =', contextStart)
    const bibleBlock = bibleSource.slice(bibleStart, bibleEnd > bibleStart ? bibleEnd : bibleSource.length)
    const contextSetupBlock = source.slice(contextStart, basePackageStart)

    expect(bibleStart).toBeGreaterThanOrEqual(0)
    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(bibleBlock).not.toContain('resolveChapterWordTarget(project, chapter')
    expect(contextSetupBlock).toContain('const wordTarget = resolveChapterWordTarget(project, chapter, {})')
    expect(contextSetupBlock).toContain('const styleLock = { ...getStyleLock(project), chapter_word_range: wordTarget.rangeText }')
  })

  test('uses multiple completion attempts before failing a short chapter', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-word-target-methods.ts'), 'utf8')
    const ensureStart = source.indexOf('const ensureProseMeetsWordTarget =')
    const groupStart = source.indexOf('return {\n    ensureProseMeetsWordTarget,', ensureStart)
    const ensureBlock = source.slice(ensureStart, groupStart > ensureStart ? groupStart : source.length)

    expect(ensureStart).toBeGreaterThanOrEqual(0)
    expect(ensureBlock).toContain('maxExpansionAttempts')
    expect(ensureBlock).toContain('for (let attempt = 1; attempt <= maxExpansionAttempts; attempt += 1)')
    expect(ensureBlock).toContain('attempts.push')
  })

  test('passes word-target expansion blueprint patches into prose review context', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const helperSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8')
    const helperStart = helperSource.indexOf('export function buildProseReviewContextPackage')
    const helperEnd = helperSource.indexOf('\nexport function', helperStart + 1)
    const helperBlock = helperSource.slice(helperStart, helperEnd > helperStart ? helperEnd : undefined)
    const generationStart = source.indexOf("await onStage('word_target', { status: 'running'")
    const generationEnd = source.indexOf('const initialReviewDecision = getQualityGateDecision', generationStart)
    const generationBlock = source.slice(generationStart, generationEnd)

    expect(helperBlock).toContain('wordTargetExpansionPatches')
    expect(helperBlock).toContain('word_target_expansion_patches')
    expect(generationBlock).toContain('const wordTargetExpansionPatches: any[] = []')
    expect(generationBlock).toContain('wordTargetExpansionPatches.push')
    expect(generationBlock).toContain('scan: text => scanProseForQualityLoop(text, contextPackage, wordTarget, wordTargetCompatibility ? {')
    expect(generationBlock).toContain('word_target_compatibility_pass: true')
    expect(generationBlock).toContain('compatibility_ceiling: wordTargetCompatibility.compatibility_ceiling')
    expect(generationBlock).toContain('finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate')
  })

  test('does not fail chapter production solely because a recovered draft result still has an error field', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const draftStart = source.indexOf('const resultPayload = getNovelPayload(draftResult)')
    const draftEnd = source.indexOf('let editorRewrite', draftStart)
    const failureBlock = source.slice(draftStart, draftEnd)

    expect(draftStart).toBeGreaterThanOrEqual(0)
    expect(failureBlock).toContain('const chapterText =')
    expect(failureBlock).toContain('resultPayload?.proseChapters')
    expect(failureBlock).toContain('targetProse?.chapterText')
    expect(failureBlock).toContain('resultPayload?.chapterText')
    expect(failureBlock).toContain('targetProse?.sceneBreakdown')
    expect(failureBlock).toContain('resultPayload?.sceneBreakdown')
    expect(failureBlock).toContain('targetProse?.continuityNotes')
    expect(failureBlock).toContain('resultPayload?.continuityNotes')
    expect(failureBlock).toContain('if (!chapterText)')
    expect(failureBlock).not.toContain('(draftResult as any).error || !chapterText')
  })

  test('accepts camelCase commercial editor rewrite payloads', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-polish-methods.ts'), 'utf8')
    const editorStart = source.indexOf('const runCommercialEditorRewrite =')
    const editorEnd = source.indexOf('const runMemePolish =', editorStart)
    const editorBlock = source.slice(editorStart, editorEnd)

    expect(editorStart).toBeGreaterThanOrEqual(0)
    expect(editorEnd).toBeGreaterThan(editorStart)
    expect(editorBlock).toContain('payload?.proseChapters')
    expect(editorBlock).toContain('rewrittenFirst?.chapterText')
    expect(editorBlock).toContain('payload?.chapterText')
    expect(editorBlock).toContain('payload?.editorReport')
    expect(editorBlock).toContain('rewrittenFirst?.sceneBreakdown')
    expect(editorBlock).toContain('payload?.sceneBreakdown')
    expect(editorBlock).toContain('rewrittenFirst?.continuityNotes')
    expect(editorBlock).toContain('payload?.continuityNotes')
  })

  test('accepts camelCase meme polish payloads without losing safety reports', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-polish-methods.ts'), 'utf8')
    const memeStart = source.indexOf('const runMemePolish =')
    const memeEnd = source.indexOf('const runReadabilityReview =', memeStart)
    const memeBlock = source.slice(memeStart, memeEnd)

    expect(memeStart).toBeGreaterThanOrEqual(0)
    expect(memeEnd).toBeGreaterThan(memeStart)
    expect(memeBlock).toContain('payload?.proseChapters')
    expect(memeBlock).toContain('polishedFirst?.chapterText')
    expect(memeBlock).toContain('payload?.chapterText')
    expect(memeBlock).toContain('payload?.memePolishReport?.changedPlot')
    expect(memeBlock).toContain('payload?.memePolishReport')
    expect(memeBlock).toContain('polishedFirst?.sceneBreakdown')
    expect(memeBlock).toContain('payload?.sceneBreakdown')
    expect(memeBlock).toContain('polishedFirst?.continuityNotes')
    expect(memeBlock).toContain('payload?.continuityNotes')
  })

  test('requires scene-card prompts to plan commercial reader hooks before prose generation', () => {
    const promptBlock = readSceneCardsPromptSource()

    expect(promptBlock).toContain('opening_hook')
    expect(promptBlock).toContain('reader_payoff')
    expect(promptBlock).toContain('fear_point')
    expect(promptBlock).toContain('rule_pressure')
    expect(promptBlock).toContain('information_gap')
    expect(promptBlock).toContain('reversal')
    expect(promptBlock).toContain('ending_hook_seed')
    expect(promptBlock).toContain('每个场景必须同时声明：人物要什么、什么挡着、结束后哪里不同')
    expect(promptBlock).toContain('purpose 不得只写“观察/进入/等待/经过”')
    expect(promptBlock).toContain('conflict 必须是可见阻碍/规则压力/对手动作/代价')
    expect(promptBlock).toContain('turning_point/exit_state/state_changes_expected 必须写出局势、关系、信息或状态变化')
    expect(promptBlock).toContain('缺任一项不得输出该场景卡')
  })

  test('requires scene-card prompts to repair recent serial fatigue before prose generation', () => {
    const promptBlock = readSceneCardsPromptSource()

    expect(promptBlock).toContain('recent_fatigue_brief')
    expect(promptBlock).toContain('risk_signals')
    expect(promptBlock).toContain('next_actions')
    expect(promptBlock).toContain('two_chapter_momentum_stall')
    expect(promptBlock).toContain('five_chapter_texture_gap')
    expect(promptBlock).toContain('conflict_thrill_overrun')
    expect(promptBlock).toContain('场景卡阶段')
    expect(promptBlock).toContain('正文生成前')
    expect(promptBlock).toContain('目标推进、阻碍升级、新信息')
    expect(promptBlock).toContain('关系/世界调剂')
    expect(promptBlock).toContain('冲突冷却')
  })

  test('requires scene-card prompts to consume rolling rhythm preflight before prose generation', () => {
    const promptBlock = readSceneCardsPromptSource()

    expect(promptBlock).toContain('rolling_rhythm_preflight')
    expect(promptBlock).toContain('拉期待速度 > 断期待速度')
    expect(promptBlock).toContain('期待真空期急救')
    expect(promptBlock).toContain('反派视角转接')
    expect(promptBlock).toContain('突发意外')
    expect(promptBlock).toContain('配角杠杆')
    expect(promptBlock).toContain('超额收获')
    expect(promptBlock).toContain('卖点偏移')
    expect(promptBlock).toContain('同一核心梗连续3次以上无差异化')
    expect(promptBlock).toContain('serial_risk_repairs')
    expect(promptBlock).toContain('recent_fatigue_action')
  })

  test('requires scene-card prompts to plan delivery-risk carry-over before prose generation', () => {
    const promptBlock = readSceneCardsPromptSource()

    expect(promptBlock).toContain('delivery_risk_carry_over')
    expect(promptBlock).toContain('质量续航')
    expect(promptBlock).toContain('opening_actions')
    expect(promptBlock).toContain('middle_actions')
    expect(promptBlock).toContain('ending_actions')
    expect(promptBlock).toContain('forbidden_repeats')
    expect(promptBlock).toContain('场景卡阶段')
    expect(promptBlock).toContain('serial_risk_repairs')
    expect(promptBlock).toContain('opening_hook')
    expect(promptBlock).toContain('ending_hook_seed')
  })

  test('requires scene-card prompts and briefs to preserve serial risk repair fields', () => {
    const sceneBriefSource = readFileSync(join(import.meta.dir, '../novel-writing/scene-briefs.ts'), 'utf8')
    const promptBlock = readSceneCardsPromptSource()
    const briefStart = sceneBriefSource.indexOf('export function sceneBriefFromCard')
    const briefBlock = sceneBriefSource.slice(briefStart)

    expect(briefStart).toBeGreaterThanOrEqual(0)
    expect(promptBlock).toContain('serial_risk_repairs(array)')
    expect(promptBlock).toContain('recent_fatigue_action')
    expect(promptBlock).toContain('每个风险修复场景')
    expect(promptBlock).toContain('写入 serial_risk_repairs')
    expect(promptBlock).toContain('写入 recent_fatigue_action')
    expect(briefBlock).toContain('serial_risk_repairs')
    expect(briefBlock).toContain('recent_fatigue_action')
  })

  test('requires scene-card prompts to plan and prose prompts to execute beat density levels', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const scenePromptBlock = readSceneCardsPromptSource()
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(scenePromptBlock).toContain('density_level')
    expect(scenePromptBlock).toContain('疏密分配')
    expect(scenePromptBlock).toContain('dense/medium/sparse')
    expect(scenePromptBlock).toContain('爽点/打脸/反转/情绪高潮')
    expect(scenePromptBlock).toContain('过场/赶路/信息交代/时间跳转')
    expect(scenePromptBlock).toContain('铺垫/日常/关系升温')
    expect(scenePromptBlock).toContain('详写必须集中在情绪节点')
    expect(prosePromptBlock).toContain('density_level=dense')
    expect(prosePromptBlock).toContain('density_level=sparse')
    expect(prosePromptBlock).toContain('density_level=medium')
    expect(prosePromptBlock).toContain('不允许每个 beat 一样长一样细')
  })

  test('requires prose generation prompts to apply oh-story natural writing baselines', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('oh-story 自然写作底线')
    expect(prosePromptBlock).toContain('动作 -> 对话 -> 情绪反应')
    expect(prosePromptBlock).toContain('单写心理活动不得连续超过 2 段')
    expect(prosePromptBlock).toContain('打斗/紧张用 3-8 字短句')
    expect(prosePromptBlock).toContain('对话必须口语化')
    expect(prosePromptBlock).toContain('章尾用动作、对话或悬念收束')
    expect(prosePromptBlock).toContain('不得用总结性感悟、哲理升华或作者预告收尾')
  })

  test('requires scene-card prompts and prose prompts to preserve purpose tags for detail allocation', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const scenePromptBlock = readSceneCardsPromptSource()
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(scenePromptBlock).toContain('purpose_tag')
    expect(scenePromptBlock).toContain('目的词')
    expect(scenePromptBlock).toContain('铺垫/高潮/爽点/打脸/人物塑造/设定/过渡/信息交代')
    expect(scenePromptBlock).toContain('爽点/打脸/高潮展开')
    expect(scenePromptBlock).toContain('过渡/赶路/信息交代带过')
    expect(prosePromptBlock).toContain('scene_cards.purpose_tag')
    expect(prosePromptBlock).toContain('按目的词分配详略')
    expect(reviewPrompt).toContain('scene_cards.purpose_tag')
    expect(reviewPrompt).toContain('quality_audit_checks')
    expect(reviewPrompt).toContain('平均用力')
    expect(revisionPrompt).toContain('scene_cards.purpose_tag')
    expect(revisionPrompt).toContain('目的词详略分配')
  })

  test('requires scene-card prompts to plan and prose prompts to execute sensory anchors', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const scenePromptBlock = readSceneCardsPromptSource()
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(scenePromptBlock).toContain('sensory_anchor')
    expect(scenePromptBlock).toContain('感知素材库')
    expect(scenePromptBlock).toContain('字迹深浅、纸张触感、墨水洇开、页角卷曲')
    expect(scenePromptBlock).toContain('对方表情变化、语气停顿、空气里的沉默')
    expect(scenePromptBlock).toContain('脚步声、地面的触感、风的方向')
    expect(scenePromptBlock).toContain('感知是主角主动注意到的细节')
    expect(scenePromptBlock).toContain('感知不能是装饰性场景描写')
    expect(prosePromptBlock).toContain('scene_cards.sensory_anchor')
    expect(prosePromptBlock).toContain('主角主动注意到')
    expect(prosePromptBlock).toContain('不能当装饰性氛围')
  })

  test('runs commercial editor rewrite between word-target expansion and self-review in chapter group generation', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftOnlyStart = source.indexOf('if (isDraftOnly)', groupStart)
    const reviewStart = source.indexOf('let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>', groupStart)
    const beforeReviewBlock = source.slice(draftOnlyStart, reviewStart)

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(reviewStart).toBeGreaterThan(groupStart)
    expect(beforeReviewBlock).toContain('runCommercialEditorRewrite(')
    expect(beforeReviewBlock).toContain("onStage('editor'")
  })

  test('auto-repairs generation preflight gaps before unattended chapter group generation blocks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const gateStart = source.indexOf('await enforcePreparedGate(false)', groupStart)
    const beforeGate = source.slice(groupStart, gateStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(groupStart).toBeGreaterThan(repairStart)
    expect(gateStart).toBeGreaterThan(groupStart)
    expect(beforeGate).toContain('options.auto_repair_missing_material === true')
    expect(beforeGate).toContain('autoRepairChapterPreflightGaps(')
    expect(beforeGate).toContain("onStage('material_repair'")
    expect(beforeGate).toContain('const repairedContextPackage = applyChapterWordTargetToContext(')
    expect(beforeGate).toContain('preparedGeneration = prepareProseGenerationContract(repairedContextPackage, postRepairOptions)')
    expect(beforeGate).not.toContain('options.allow_incomplete !== true')
  })

  test('returns repaired write preparation brief on context_package after preflight repair', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const returnStart = source.indexOf('return {', source.indexOf('const finalWritePreparationBrief = buildWritePreparationBrief', repairStart))
    const returnBlock = source.slice(returnStart, returnStart + 900)
    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(returnBlock).toContain('context_package: repairedContextPackage')
    expect(source.slice(repairStart, returnStart + 900)).toContain('write_preparation_brief: finalWritePreparationBrief')
    expect(source.slice(repairStart, returnStart + 900)).toContain('Keep returned context_package aligned with the repaired brief/contracts')
  })

  test('infers material repair keys from preflight warning corpus, not only failed check keys', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const needsStart = source.indexOf('const needsChapterBlueprint =', repairStart)
    const repairHeader = source.slice(repairStart, needsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(needsStart).toBeGreaterThan(repairStart)
    expect(repairHeader).toContain('const warningCorpus =')
    expect(repairHeader).toContain("target_emotion|人物出场|character_order")
    expect(repairHeader).toContain('source_paths_missing|文风召回|benchmark_recall')
    expect(repairHeader).toContain('追踪\\/?时间线|timeline_tracking')
    expect(repairHeader).toContain("['chapter_blueprint', 'source_readiness_chapter_blueprint']")
    expect(repairHeader).toContain("['benchmark_recall_source_paths', 'benchmark_recall_gate']")
    expect(repairHeader).toContain("['source_readiness_timeline_tracking']")
  })

  test('blocks unattended prose generation when scene cards remain missing after auto repair', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const sceneCardsStage = source.indexOf("await onStage('scene_cards', { status: 'running' })", groupStart)
    const promptCompileStart = source.indexOf('const compiledPrompt = compileParagraphProseContext', groupStart)
    const sceneCardsBlock = source.slice(sceneCardsStage, promptCompileStart)

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(sceneCardsStage).toBeGreaterThan(groupStart)
    expect(promptCompileStart).toBeGreaterThan(sceneCardsStage)
    expect(sceneCardsBlock).toContain('if (!generationContract.chapter.scene_cards.length || options.force_scene_cards === true)')
    expect(sceneCardsBlock).toContain('preparedGeneration = prepareProseGenerationContract(sceneContextPackage, options)')
    expect(sceneCardsBlock).toContain('await enforcePreparedGate(true)')
    expect(sceneCardsBlock).not.toContain('options.allow_incomplete !== true')
  })

  test('refreshes repaired worldbuilding before unattended preflight is evaluated again', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const repairCall = source.indexOf('const repairResult = await autoRepairChapterPreflightGaps', groupStart)
    const rebuildStart = source.indexOf('const repairedContextPackage = applyChapterWordTargetToContext(', repairCall)
    const gateStart = source.indexOf('await enforcePreparedGate(false)', rebuildStart)
    const repairRefreshBlock = source.slice(repairCall, rebuildStart)
    const rebuiltContractBlock = source.slice(rebuildStart, gateStart)

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(repairCall).toBeGreaterThan(groupStart)
    expect(rebuildStart).toBeGreaterThan(repairCall)
    expect(repairRefreshBlock).toContain('persist: false')
    expect(repairRefreshBlock).toContain('worldbuilding = repairResult.worldbuilding || worldbuilding')
    expect(repairRefreshBlock).toContain('characters = repairResult.characters || characters')
    expect(repairRefreshBlock).toContain('settings = repairResult.settings || settings')
    expect(repairRefreshBlock).toContain('chapterSettingUsage = repairResult.staged_usage_replacement || chapterSettingUsage')
    expect(repairRefreshBlock).toContain('reviews = [...reviews, ...asArray(repairResult.staged_reviews)]')
    expect(repairRefreshBlock).not.toContain('await listNovelWorldbuilding')
    expect(repairRefreshBlock).not.toContain('await createNovel')
    expect(repairRefreshBlock).not.toContain('await updateNovel')
    expect(rebuiltContractBlock).toContain('runtime?.buildChapterContext ? await buildGenerationContext() : repairResult.context_package')
    expect(rebuiltContractBlock).toContain('preparedGeneration = prepareProseGenerationContract(repairedContextPackage, postRepairOptions)')
    expect(rebuiltContractBlock).toContain('generationContract = preparedGeneration.contract')
  })

  test('auto-repairs missing unattended chapter blueprint before prose generation', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('const needsChapterBlueprint =')
    expect(repairBlock).toContain("missingKeys.includes('chapter_blueprint')")
    expect(repairBlock).toContain("missingKeys.includes('ending_hook')")
    expect(repairBlock).toContain("executeAgent('outline-agent'")
    expect(repairBlock).toContain('chapter_goal:')
    expect(repairBlock).toContain('ending_hook:')
    expect(repairBlock).toContain("type: 'chapter_blueprint_updated'")
  })

  test('auto-repairs unattended chapter blueprint with a persisted oh-story blueprint contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('chapter_blueprint')
    expect(repairBlock).toContain('target_emotion')
    expect(repairBlock).toContain('core_payoff')
    expect(repairBlock).toContain('content_outline')
    expect(repairBlock).toContain('beat_density_contract')
    expect(repairBlock).toContain('function_tag 必须决定展开还是带过')
    expect(repairBlock).toContain('beat_density_contract: buildChapterBlueprintBeatDensityContract')
    expect(repairBlock).toContain('ending_contract')
    expect(repairBlock).toContain('const repairedChapterBlueprint =')
    expect(repairBlock).toContain('pre_draft_brief:')
    expect(repairBlock).toContain('chapter_blueprint: repairedChapterBlueprint')
  })

  test('auto-repairs unattended chapter blueprint with an oh-story outline methods contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('outline_methods_contract')
    expect(repairBlock).toContain('大纲方法合同')
    expect(repairBlock).toContain('五步大纲创建法')
    expect(repairBlock).toContain('八节点故事结构')
    expect(repairBlock).toContain('爽文五阶段小循环')
    expect(repairBlock).toContain('情绪拉扯五折线')
    expect(repairBlock).toContain('相同金手指逻辑禁止连续使用')
    expect(repairBlock).toContain('outline_methods_contract: buildOutlineMethodsContract')
  })

  test('auto-repairs unattended chapter blueprint with oh-story emotion and paragraph hook contracts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('emotional_arc_contract')
    expect(repairBlock).toContain('chapter_hook_contract')
    expect(repairBlock).toContain('paragraph_hook_contract')
    expect(repairBlock).toContain('opening_contract')
    expect(repairBlock).toContain('suspense_contract')
    expect(repairBlock).toContain('reversal_contract')
    expect(repairBlock).toContain('let repairedEmotionAndHookBrief = buildChapterPreDraftBrief')
    expect(repairBlock).toContain('emotional_arc_contract: repairedEmotionAndHookBrief.emotional_arc_contract')
    expect(repairBlock).toContain('chapter_hook_contract: repairedEmotionAndHookBrief.chapter_hook_contract')
    expect(repairBlock).toContain('paragraph_hook_contract: repairedEmotionAndHookBrief.paragraph_hook_contract')
    expect(repairBlock).toContain('opening_contract: repairedEmotionAndHookBrief.opening_contract')
    expect(repairBlock).toContain('suspense_contract: repairedEmotionAndHookBrief.suspense_contract')
    expect(repairBlock).toContain('reversal_contract: repairedEmotionAndHookBrief.reversal_contract')
    expect(repairBlock).toContain('情绪弧合同')
    expect(repairBlock).toContain('章级钩子合同')
    expect(repairBlock).toContain('段落级钩子合同')
    expect(repairBlock).toContain('开篇合同')
    expect(repairBlock).toContain('悬念合同')
    expect(repairBlock).toContain('reader_preknowledge_rules')
    expect(repairBlock).toContain('trump_card_preposition_rules')
    expect(repairBlock).toContain('读者预知法')
    expect(repairBlock).toContain('底牌前置法')
    expect(repairBlock).toContain('first_impression_rules')
    expect(repairBlock).toContain('peak_end_rules')
    expect(repairBlock).toContain('emotion_layer_rules')
    expect(repairBlock).toContain('reaction_structure_rules')
    expect(repairBlock).toContain('ideological_conflict_rules')
    expect(repairBlock).toContain('先入为主')
    expect(repairBlock).toContain('峰终定律')
    expect(repairBlock).toContain('三层情绪')
    expect(repairBlock).toContain('前反应')
    expect(repairBlock).toContain('以小搏大')
    expect(repairBlock).toContain('理念矛盾')
    expect(repairBlock).toContain('反转合同')
  })

  test('auto-repairs unattended chapter blueprint with oh-story plot and prose quality contracts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('plot_dynamics_contract')
    expect(repairBlock).toContain('information_flow_contract')
    expect(repairBlock).toContain('expectation_threshold_contract')
    expect(repairBlock).toContain('story_loop_contract')
    expect(repairBlock).toContain('prose_craft_contract')
    expect(repairBlock).toContain('punctuation_tone_contract')
    expect(repairBlock).toContain('quality_audit_contract')
    expect(repairBlock).toContain('plot_dynamics_contract: repairedEmotionAndHookBrief.plot_dynamics_contract')
    expect(repairBlock).toContain('information_flow_contract: repairedEmotionAndHookBrief.information_flow_contract')
    expect(repairBlock).toContain('expectation_threshold_contract: repairedEmotionAndHookBrief.expectation_threshold_contract')
    expect(repairBlock).toContain('story_loop_contract: repairedEmotionAndHookBrief.story_loop_contract')
    expect(repairBlock).toContain('prose_craft_contract: repairedEmotionAndHookBrief.prose_craft_contract')
    expect(repairBlock).toContain('punctuation_tone_contract: repairedEmotionAndHookBrief.punctuation_tone_contract')
    expect(repairBlock).toContain('quality_audit_contract: repairedEmotionAndHookBrief.quality_audit_contract')
    expect(repairBlock).toContain('剧情动力合同')
    expect(repairBlock).toContain('信息流合同')
    expect(repairBlock).toContain('期待阈值合同')
    expect(repairBlock).toContain('expectation_relay_rules')
    expect(repairBlock).toContain('期待接力法')
    expect(repairBlock).toContain('故事循环合同')
    expect(repairBlock).toContain('正文工艺合同')
    expect(repairBlock).toContain('正文工艺短口径')
    expect(repairBlock).toContain('subject_name_rhythm_rules')
    expect(repairBlock).toContain('主语与名字节奏')
    expect(repairBlock).not.toContain('subject_name_rhythm_rules 必须包含主语与名字节奏')
    expect(repairBlock).toContain('indirect_description_rules')
    expect(repairBlock).toContain('间接描写法')
    expect(repairBlock).toContain('侧面反应才是爽点')
    expect(repairBlock).toContain('three_camera_rules')
    expect(repairBlock).toContain('三机位法')
    expect(repairBlock).toContain('设定都由冲突引出')
    expect(repairBlock).toContain('then_what_rules')
    expect(repairBlock).toContain('然后呢')
    expect(repairBlock).toContain('每一段文字')
    expect(repairBlock).toContain('core_emotion_alignment_rules')
    expect(repairBlock).toContain('围绕核心情绪设计全部情节')
    expect(repairBlock).toContain('宏观把控整体节奏')
    expect(repairBlock).toContain('baimiao_sensory_rules')
    expect(repairBlock).toContain('白描')
    expect(repairBlock).toContain('五感必须服务情绪')
    expect(repairBlock).not.toContain('baimiao_sensory_rules 必须包含白描 = 最少的字')
    expect(repairBlock).toContain('dynamic_description_rules')
    expect(repairBlock).toContain('动态描写优于静态描写')
    expect(repairBlock).toContain('动作和反应展现')
    expect(repairBlock).toContain('角色行动中穿插点染')
    expect(repairBlock).toContain('shot_rhythm_rules')
    expect(repairBlock).toContain('镜头与分镜思维')
    expect(repairBlock).toContain('远景/中景/近景/特写')
    expect(repairBlock).toContain('短句、短段、密集动作')
    expect(repairBlock).toContain('transition_bridge_rules')
    expect(repairBlock).toContain('场景切换与转场')
    expect(repairBlock).toContain('时间跳转')
    expect(repairBlock).toContain('动作或物件衔接')
    expect(repairBlock).toContain('声音或光影衔接')
    expect(repairBlock).toContain('section_density_rules')
    expect(repairBlock).toContain('anti_padding_rules')
    expect(repairBlock).toContain('小节密度诊断')
    expect(repairBlock).toContain('description_limits')
    expect(repairBlock).toContain('水分控制')
    expect(repairBlock).toContain('删掉这段后读者会不会困惑')
    expect(repairBlock).toContain('anti_ai_smell_rules')
    expect(repairBlock).toContain('高危词')
    expect(repairBlock).toContain('章末总结体')
    expect(repairBlock).toContain('叠加式描写')
    expect(repairBlock).toContain('语气标点合同')
    expect(repairBlock).toContain('质量诊断合同')
    expect(repairBlock).toContain('maxTokens: 6800')
  })

  test('auto-repairs unattended chapter blueprint with oh-story character asset and state contracts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('dialogue_contract')
    expect(repairBlock).toContain('continuity_heat_contract')
    expect(repairBlock).toContain('character_relation_contract')
    expect(repairBlock).toContain('character_behavior_contract')
    expect(repairBlock).toContain('asset_linkage_contract')
    expect(repairBlock).toContain('state_tracking_contract')
    expect(repairBlock).toContain('intent_confirmation_contract')
    expect(repairBlock).toContain('dialogue_contract: repairedEmotionAndHookBrief.dialogue_contract')
    expect(repairBlock).toContain('continuity_heat_contract: repairedEmotionAndHookBrief.continuity_heat_contract')
    expect(repairBlock).toContain('character_relation_contract: repairedEmotionAndHookBrief.character_relation_contract')
    expect(repairBlock).toContain('character_behavior_contract: repairedEmotionAndHookBrief.character_behavior_contract')
    expect(repairBlock).toContain('asset_linkage_contract: repairedEmotionAndHookBrief.asset_linkage_contract')
    expect(repairBlock).toContain('state_tracking_contract: repairedEmotionAndHookBrief.state_tracking_contract')
    expect(repairBlock).toContain('intent_confirmation_contract: repairedEmotionAndHookBrief.intent_confirmation_contract')
    expect(repairBlock).toContain('对白合同')
    expect(repairBlock).toContain('mode_playbooks')
    expect(repairBlock).toContain('power_length_rules')
    expect(repairBlock).toContain('subtext_agenda_rules')
    expect(repairBlock).toContain('tone_context_rules')
    expect(repairBlock).toContain('emotion_push_rules')
    expect(repairBlock).toContain('emotion_continuity_rules')
    expect(repairBlock).toContain('dialogue_drive_rules')
    expect(repairBlock).toContain('information_embed_rules')
    expect(repairBlock).toContain('information_tension_rules')
    expect(repairBlock).toContain('voice_differentiation_rules')
    expect(repairBlock).toContain('spectator_dialogue_rules')
    expect(repairBlock).toContain('dialogue_rhythm_rules')
    expect(repairBlock).toContain('dialogue_volume_rules')
    expect(repairBlock).toContain('dialogue_meme_rules')
    expect(repairBlock).toContain('dialogue_audit_rules')
    expect(repairBlock).toContain('掌控者/主角亮底牌时对白 ≤ 10 字')
    expect(repairBlock).toContain('真实动机绝对不能浅显地写在台词里')
    expect(repairBlock).toContain('命令式+否定式最能激发读者情绪')
    expect(repairBlock).toContain('用角色的语气和立场包裹信息')
    expect(repairBlock).toContain('口癖和惯用语')
    expect(repairBlock).toContain('关系阶段不同')
    expect(repairBlock).toContain('普通人震惊')
    expect(repairBlock).toContain('专业人士分析')
    expect(repairBlock).toContain('不代替主线')
    expect(repairBlock).toContain('连续多轮对话后需要换气')
    expect(repairBlock).toContain('关键信息放对话开头或结尾')
    expect(repairBlock).toContain('读者已知信息')
    expect(repairBlock).toContain('突发状况替代')
    expect(repairBlock).toContain('新人物必须安排主线戏份')
    expect(repairBlock).toContain('说不出来但意思到了')
    expect(repairBlock).toContain('不得直接复刻')
    expect(repairBlock).toContain('大量信息都必须用对话来展示')
    expect(repairBlock).toContain('问答式的一问一答')
    expect(repairBlock).toContain('依赖对话来推动剧情或人物变化')
    expect(repairBlock).toContain('遮住角色名后能否区分')
    expect(repairBlock).toContain('单次对话不超过全节 40%')
    expect(repairBlock).toContain('自然口语交流')
    expect(repairBlock).toContain('对话结尾能否预示接下来的节奏变化')
    expect(repairBlock).toContain('连续性热度合同')
    expect(repairBlock).toContain('角色关系合同')
    expect(repairBlock).toContain('expectation_hub_rules')
    expect(repairBlock).toContain('buffer_zone_rules')
    expect(repairBlock).toContain('配角期待枢纽')
    expect(repairBlock).toContain('任务基地')
    expect(repairBlock).toContain('短期和长期期待')
    expect(repairBlock).toContain('配角攻略缓冲区')
    expect(repairBlock).toContain('信息差、地位差距、亲密度差距或信任程度')
    expect(repairBlock).toContain('配角不能像 NPC 一样站着等主角触发')
    expect(repairBlock).toContain('角色行为合同')
    expect(repairBlock).toContain('strong_association_rules')
    expect(repairBlock).toContain('每个重要角色至少 3 个强关联设定')
    expect(repairBlock).toContain('资产挂钩合同')
    expect(repairBlock).toContain('prop_ability_expectation_rules')
    expect(repairBlock).toContain('道具能力展示的8步期待模板')
    expect(repairBlock).toContain('鸡肋成神器')
    expect(repairBlock).toContain('状态跟踪合同')
    expect(repairBlock).toContain('意图确认合同')
  })

  test('unattended character repair asks for layered missing role pools', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('任务：为无人值守章节写作自动补齐前置材料')
    const characterCreateStart = source.indexOf('const existingNames = new Set', repairStart)
    const repairBlock = source.slice(repairStart, characterCreateStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(characterCreateStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('primary_supporting')
    expect(repairBlock).toContain('secondary_supporting')
    expect(repairBlock).toContain('cameo_supporting')
    expect(repairBlock).toContain('antagonist_minor')
    expect(repairBlock).toContain('faction_agent')
    expect(repairBlock).toContain('antagonist_logic')
  })

  test('unattended character repair uses tier-aware candidate limits instead of first six', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')

    expect(source).toContain('selectTierAwareCharacterRepairCandidates')
    expect(source).not.toContain('characterCandidates.slice(0, 6)')
  })

  test('auto-repairs unattended chapter blueprint with oh-story reader genre upgrade and conflict contracts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('target_reader_contract')
    expect(repairBlock).toContain('genre_positioning_contract')
    expect(repairBlock).toContain('upgrade_rhythm_contract')
    expect(repairBlock).toContain('conflict_structure_contract')
    expect(repairBlock).toContain('target_reader_contract: repairedEmotionAndHookBrief.target_reader_contract')
    expect(repairBlock).toContain('genre_positioning_contract: repairedEmotionAndHookBrief.genre_positioning_contract')
    expect(repairBlock).toContain('upgrade_rhythm_contract: repairedEmotionAndHookBrief.upgrade_rhythm_contract')
    expect(repairBlock).toContain('conflict_structure_contract: repairedEmotionAndHookBrief.conflict_structure_contract')
    expect(repairBlock).toContain('目标读者合同')
    expect(repairBlock).toContain('题材定位合同')
    expect(repairBlock).toContain('micro_innovation_702010_rules')
    expect(repairBlock).toContain('70%来自过去经历和记忆')
    expect(repairBlock).toContain('micro_innovation_methods')
    expect(repairBlock).toContain('精炼法')
    expect(repairBlock).toContain('升级节奏合同')
    expect(repairBlock).toContain('ranking_ladder_rules')
    expect(repairBlock).toContain('排行榜提供升级动力')
    expect(repairBlock).toContain('goldfinger_feedback_rules')
    expect(repairBlock).toContain('把金手指带来变化的过程掺杂在故事里')
    expect(repairBlock).toContain('冲突结构合同')
    expect(repairBlock).toContain('maxTokens: 6800')
  })

  test('auto-repairs unattended chapter blueprint with oh-story female audience contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('female_audience_contract')
    expect(repairBlock).toContain('female_audience_contract: repairedEmotionAndHookBrief.female_audience_contract')
    expect(repairBlock).toContain('女频长篇合同')
    expect(repairBlock).toContain('安全感优先')
    expect(repairBlock).toContain('女主主动性')
    expect(repairBlock).toContain('感情线双轴')
    expect(repairBlock).toContain('每段虐后必给反转或糖')
    expect(repairBlock).toContain('番茄女生')
    expect(repairBlock).toContain('货板一致')
  })

  test('auto-repairs unattended chapter blueprint with oh-story showdown contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('showdown_contract')
    expect(repairBlock).toContain('showdown_contract: repairedEmotionAndHookBrief.showdown_contract')
    expect(repairBlock).toContain('高潮对抗合同')
    expect(repairBlock).toContain('爽点释放')
    expect(repairBlock).toContain('三压一爆三震')
    expect(repairBlock).toContain('友好势力')
    expect(repairBlock).toContain('群众层 -> 中间层 -> 核心层')
    expect(repairBlock).toContain('打斗是一场表演')
    expect(repairBlock).toContain('急 -> 缓 -> 急')
    expect(repairBlock).toContain('底牌管理')
    expect(repairBlock).toContain('每次只出1个')
    expect(repairBlock).toContain('invincible_protagonist_rules')
    expect(repairBlock).toContain('主角登场即杀伐果断')
  })

  test('auto-repairs unattended chapter blueprint with oh-story bridge unit contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('bridge_unit_contract')
    expect(repairBlock).toContain('bridge_unit_contract: repairedEmotionAndHookBrief.bridge_unit_contract')
    expect(repairBlock).toContain('桥段节奏合同')
    expect(repairBlock).toContain('四章一桥段')
    expect(repairBlock).toContain('高潮中埋钩子')
    expect(repairBlock).toContain('连续 2 章没有目标推进')
  })

  test('auto-repairs unattended chapter blueprint with oh-story plot framework contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('plot_framework_contract')
    expect(repairBlock).toContain('plot_framework_contract: repairedEmotionAndHookBrief.plot_framework_contract')
    expect(repairBlock).toContain('剧情框架合同')
    expect(repairBlock).toContain('题材→框架路由')
    expect(repairBlock).toContain('RPG结构与奖励设计')
    expect(repairBlock).toContain('框架与阵营手牌法')
    expect(repairBlock).toContain('套路模板重复法')
    expect(repairBlock).toContain('五不崩')
  })

  test('auto-repairs unattended chapter blueprint with oh-story style boundary contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('style_boundary_contract')
    expect(repairBlock).toContain('style_boundary_contract: repairedEmotionAndHookBrief.style_boundary_contract')
    expect(repairBlock).toContain('文风覆盖边界合同')
    expect(repairBlock).toContain('硬约束永远赢')
    expect(repairBlock).toContain('Gate F')
    expect(repairBlock).toContain('禁用词')
  })

  test('auto-repairs unattended chapter blueprint with persisted pre-draft launch briefs', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('previous_handoff: repairedEmotionAndHookBrief.previous_handoff')
    expect(repairBlock).toContain('reader_promise: repairedEmotionAndHookBrief.reader_promise')
    expect(repairBlock).toContain('emotional_curve: repairedEmotionAndHookBrief.emotional_curve')
    expect(repairBlock).toContain('platform_rubric: repairedEmotionAndHookBrief.platform_rubric')
    expect(repairBlock).toContain('content_rubric: repairedEmotionAndHookBrief.content_rubric')
    expect(repairBlock).toContain('reader_retention_brief: repairedEmotionAndHookBrief.reader_retention_brief')
    expect(repairBlock).toContain('story_drive_brief: repairedEmotionAndHookBrief.story_drive_brief')
    expect(repairBlock).toContain('serial_rhythm_brief: repairedEmotionAndHookBrief.serial_rhythm_brief')
    expect(repairBlock).toContain('page_turn_hook_brief: repairedEmotionAndHookBrief.page_turn_hook_brief')
    expect(repairBlock).toContain('benchmark_recall_brief: repairedEmotionAndHookBrief.benchmark_recall_brief')
    expect(repairBlock).toContain('core_contract_radar: repairedEmotionAndHookBrief.core_contract_radar')
  })

  test('auto-repairs unattended chapter blueprint with persisted longform continuity launch briefs', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('key_settings: repairedEmotionAndHookBrief.key_settings')
    expect(repairBlock).toContain('forbidden_content: repairedEmotionAndHookBrief.forbidden_content')
    expect(repairBlock).toContain('storyline_advances: repairedEmotionAndHookBrief.storyline_advances')
    expect(repairBlock).toContain('storyline_plants: repairedEmotionAndHookBrief.storyline_plants')
    expect(repairBlock).toContain('storyline_payoffs: repairedEmotionAndHookBrief.storyline_payoffs')
    expect(repairBlock).toContain('storyline_forbidden: repairedEmotionAndHookBrief.storyline_forbidden')
    expect(repairBlock).toContain('reader_drop_risk_brief: repairedEmotionAndHookBrief.reader_drop_risk_brief')
    expect(repairBlock).toContain('story_pressure_brief: repairedEmotionAndHookBrief.story_pressure_brief')
    expect(repairBlock).toContain('volume_climax_brief: repairedEmotionAndHookBrief.volume_climax_brief')
    expect(repairBlock).toContain('recent_fatigue_brief: repairedEmotionAndHookBrief.recent_fatigue_brief')
    expect(repairBlock).toContain('delivery_risk_carry_over: repairedEmotionAndHookBrief.delivery_risk_carry_over')
    expect(repairBlock).toContain('reader_expectation_debt: repairedEmotionAndHookBrief.reader_expectation_debt')
    expect(repairBlock).toContain('reader_expectation_ledger: repairedEmotionAndHookBrief.reader_expectation_ledger')
    expect(repairBlock).toContain('longform_compass: repairedEmotionAndHookBrief.longform_compass')
    expect(repairBlock).toContain('longform_memory_capsule: repairedEmotionAndHookBrief.longform_memory_capsule')
    expect(repairBlock).toContain('layered_memory_context: repairedEmotionAndHookBrief.layered_memory_context')
    expect(repairBlock).toContain('next_batch_brief: repairedEmotionAndHookBrief.next_batch_brief')
    expect(repairBlock).toContain('story_unit_context: repairedEmotionAndHookBrief.story_unit_context')
  })

  test('auto-repairs unattended chapter blueprint with persisted commercial style and scene briefs', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('character_arc_brief: repairedEmotionAndHookBrief.character_arc_brief')
    expect(repairBlock).toContain('innovation_brief: repairedEmotionAndHookBrief.innovation_brief')
    expect(repairBlock).toContain('signature_scene_brief: repairedEmotionAndHookBrief.signature_scene_brief')
    expect(repairBlock).toContain('meme_strategy: repairedEmotionAndHookBrief.meme_strategy')
    expect(repairBlock).toContain('style_sample_strategy: repairedEmotionAndHookBrief.style_sample_strategy')
    expect(repairBlock).toContain('chapter_benchmark_strategy: repairedEmotionAndHookBrief.chapter_benchmark_strategy')
    expect(repairBlock).toContain('first30_retention_brief: repairedEmotionAndHookBrief.first30_retention_brief')
    expect(repairBlock).toContain('longform_battle_context: repairedEmotionAndHookBrief.longform_battle_context')
    expect(repairBlock).toContain('scene_briefs: repairedEmotionAndHookBrief.scene_briefs')
    expect(repairBlock).toContain('word_budget: repairedEmotionAndHookBrief.word_budget')
    expect(repairBlock).toContain('generated_at: repairedEmotionAndHookBrief.generated_at')
  })

  test('repairs benchmark source paths across aliases without clearing unrepaired gaps', () => {
    const repairedCamelPath = repairBenchmarkRecallSourcePathState({ chapter_no: 2 }, {
      source_paths: [],
      sourcePaths: ['MangaForge/manual/chapter-2/rhythm-reference'],
      gaps: ['source_paths_missing', 'module_rhythm_conflict'],
    }, ['source_paths_missing', 'module_rhythm_conflict'])

    expect(repairedCamelPath.benchmark_recall_brief.source_paths).toEqual(['MangaForge/manual/chapter-2/rhythm-reference'])
    expect(repairedCamelPath.benchmark_recall_gaps).toEqual(['module_rhythm_conflict'])

    const unresolvedPath = repairBenchmarkRecallSourcePathState({ chapter_no: 2 }, {
      source_paths: [],
      sourcePaths: [],
      gaps: ['source_paths_missing'],
    }, ['source_paths_missing', 'module_rhythm_conflict'])

    expect(unresolvedPath.benchmark_recall_brief.source_paths || []).toEqual([])
    expect(unresolvedPath.benchmark_recall_gaps).toContain('source_paths_missing')
    expect(unresolvedPath.benchmark_recall_gaps).toContain('module_rhythm_conflict')
  })

  test('removes only reliable source-path clauses from composite benchmark gaps', () => {
    const repaired = repairBenchmarkRecallSourcePathState({ chapter_no: 2 }, {
      source_paths: ['MangaForge/manual/chapter-2/rhythm-reference'],
      gaps: [
        'Step 2.3 source_paths_missing；module_rhythm_conflict',
        'Step 2.3 source_paths_missing',
        'source_paths_missing module_voice_conflict',
      ],
    })

    expect(repaired.benchmark_recall_brief.gaps).toContain('module_rhythm_conflict')
    expect(repaired.benchmark_recall_gaps).toContain('module_rhythm_conflict')
    expect(repaired.benchmark_recall_brief.gaps).not.toContain('Step 2.3 source_paths_missing')
    expect(repaired.benchmark_recall_gaps).not.toContain('Step 2.3 source_paths_missing')
    expect(repaired.benchmark_recall_brief.gaps).toContain('source_paths_missing module_voice_conflict')
    expect(repaired.benchmark_recall_gaps).toContain('source_paths_missing module_voice_conflict')
  })

  test('merges final repair contracts into the freshest pre-draft payload', () => {
    const latestRawPayload = {
      unrelated_top_level_key: 'keep latest top-level value',
      pre_draft_brief: {
        confirmed_at: '2026-07-11T09:30:00.000Z',
        confirmation_source: 'manual_user_confirmation',
        user_added_key: 'keep latest snake key',
      },
      preDraftBrief: {
        camel_user_added_key: 'keep latest camel key',
      },
    }
    const computedPreDraftBrief = {
      confirmed_at: '2026-07-11T08:00:00.000Z',
      confirmation_source: 'stale_repair_snapshot',
      user_added_key: 'stale value',
      benchmark_recall_brief: { source_paths: ['MangaForge/final/benchmark'], gaps: ['module_rhythm_conflict'] },
      benchmarkRecallBrief: { sourcePaths: ['MangaForge/final/benchmark'], gaps: ['module_rhythm_conflict'] },
      benchmark_recall_gaps: ['module_rhythm_conflict'],
      benchmarkRecallGaps: ['module_rhythm_conflict'],
      state_tracking_contract: { source_readiness: [{ key: 'custom', label: 'custom', status: 'missing' }] },
      stateTrackingContract: { sourceReadiness: [{ key: 'custom', label: 'custom', status: 'missing' }] },
      write_preparation_brief: { readiness_status: 'needs_context', source_gaps: ['custom missing'] },
      writePreparationBrief: { readiness_status: 'needs_context', source_gaps: ['custom missing'] },
    }

    const mergedRawPayload = mergeFinalRepairPreDraftRawPayload(latestRawPayload, computedPreDraftBrief)
    const mergedBrief = mergedRawPayload.pre_draft_brief

    expect(mergedRawPayload.unrelated_top_level_key).toBe('keep latest top-level value')
    expect(mergedBrief.confirmed_at).toBe('2026-07-11T09:30:00.000Z')
    expect(mergedBrief.confirmation_source).toBe('manual_user_confirmation')
    expect(mergedBrief.user_added_key).toBe('keep latest snake key')
    expect(mergedBrief.camel_user_added_key).toBe('keep latest camel key')
    expect(mergedBrief.benchmark_recall_brief).toMatchObject(computedPreDraftBrief.benchmark_recall_brief)
    expect(mergedBrief.benchmarkRecallBrief).toEqual(mergedBrief.benchmark_recall_brief)
    expect(mergedBrief.benchmark_recall_gaps).toEqual(computedPreDraftBrief.benchmark_recall_gaps)
    expect(mergedBrief.benchmarkRecallGaps).toEqual(computedPreDraftBrief.benchmark_recall_gaps)
    expect(mergedBrief.state_tracking_contract).toMatchObject(computedPreDraftBrief.state_tracking_contract)
    expect(mergedBrief.stateTrackingContract).toEqual(mergedBrief.state_tracking_contract)
    expect(mergedBrief.write_preparation_brief).toEqual(computedPreDraftBrief.write_preparation_brief)
    expect(mergedBrief.writePreparationBrief).toEqual(computedPreDraftBrief.write_preparation_brief)
    expect(mergedRawPayload.preDraftBrief).toEqual(mergedBrief)
  })

  test('merges final state tracking with derived dynamic fields and preserved custom policy', () => {
    const storedContract = {
      version: 'oh_story_state_tracking_v1',
      source: 'stored_contract',
      character_states: ['旧角色状态'],
      characterStates: ['旧角色状态 camel'],
      historical_causality: ['旧前史因果'],
      historicalCausality: ['旧前史因果 camel'],
      world_constraints: ['旧世界约束'],
      worldConstraints: ['旧世界约束 camel'],
      filter_rules: [],
      filterRules: ['保留 camel 自定义状态筛选约束'],
      source_requirements: [],
      sourceRequirements: ['保留 camel 自定义来源要求'],
      quality_checks: [],
      qualityChecks: ['保留 camel 自定义质量检查'],
      revision_priorities: [],
      revisionPriorities: ['保留 camel 自定义修订优先级'],
      custom_policy: { mode: 'manual_review' },
      source_readiness: [
        { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'missing', evidence: '旧 snake 行' },
        { key: 'serial_story_state', label: '连载故事状态', status: 'ready', evidence: '已过期标准行' },
        { key: 'custom_archive', label: '自定义档案', status: 'ready', evidence: '人工档案已读' },
      ],
      sourceReadiness: [
        { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'warn', evidence: '旧 camel 行' },
        { key: 'character_state', label: '角色状态', status: 'missing', evidence: '旧 camel 角色行' },
        { key: 'custom_approval', label: '自定义审批', status: 'missing', evidence: '', fix: '等待人工审批' },
      ],
    }
    const derivedContract = {
      version: 'oh_story_state_tracking_v1',
      source: 'oh_story_embedded_fallback',
      character_states: ['江哲：位置：红雾回廊；认知边界：不知道幕后主使'],
      historical_causality: ['上一章章尾：第二张规则页亮起'],
      world_constraints: ['红雾裂缝规则：暴力破坏会扩大裂缝'],
      source_readiness: [
        { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '最终蓝图已读取' },
        { key: 'character_state', label: '角色状态', status: 'ready', evidence: '最终角色 DB 已读取' },
        { key: 'world_constraints', label: '世界约束', status: 'ready', evidence: '最终世界观 DB 已读取' },
      ],
      filter_rules: ['派生默认筛选规则'],
    }

    const merged = mergeFinalStateTrackingContract(storedContract, derivedContract)
    const sourceRows = merged.source_readiness || []
    const sourceRowsCamel = merged.sourceReadiness || []

    expect(merged.character_states).toEqual(derivedContract.character_states)
    expect(merged.characterStates).toEqual(derivedContract.character_states)
    expect(merged.historical_causality).toEqual(derivedContract.historical_causality)
    expect(merged.historicalCausality).toEqual(derivedContract.historical_causality)
    expect(merged.world_constraints).toEqual(derivedContract.world_constraints)
    expect(merged.worldConstraints).toEqual(derivedContract.world_constraints)
    expect(sourceRows.find((row: any) => row.key === 'chapter_blueprint')).toEqual(derivedContract.source_readiness[0])
    expect(sourceRows.find((row: any) => row.key === 'character_state')).toEqual(derivedContract.source_readiness[1])
    expect(sourceRows.some((row: any) => row.key === 'serial_story_state')).toBe(false)
    expect(sourceRows.find((row: any) => row.key === 'custom_archive')?.status).toBe('ready')
    expect(sourceRows.find((row: any) => row.key === 'custom_approval')).toMatchObject({ status: 'missing', fix: '等待人工审批' })
    expect(sourceRowsCamel).toEqual(sourceRows)
    expect(merged.filter_rules).toEqual(storedContract.filterRules)
    expect(merged.filterRules).toEqual(storedContract.filterRules)
    expect(merged.source_requirements).toEqual(storedContract.sourceRequirements)
    expect(merged.sourceRequirements).toEqual(storedContract.sourceRequirements)
    expect(merged.quality_checks).toEqual(storedContract.qualityChecks)
    expect(merged.qualityChecks).toEqual(storedContract.qualityChecks)
    expect(merged.revision_priorities).toEqual(storedContract.revisionPriorities)
    expect(merged.revisionPriorities).toEqual(storedContract.revisionPriorities)
    expect(merged.custom_policy).toEqual(storedContract.custom_policy)
  })

  test.each(['pending', 'not_ready', 'failed', 'error', 'needs_context', 'awaiting_editor'])(
    'keeps %s custom source state over a conflicting ready alias',
    status => {
      const merged = mergeFinalStateTrackingContract({
        source_readiness: [
          { key: 'custom_editorial_source', label: '自定义编辑来源', status: 'ready', evidence: '旧 ready alias' },
        ],
        sourceReadiness: [
          { key: 'custom_editorial_source', label: '自定义编辑来源', status, evidence: '仍未就绪' },
        ],
      }, {
        source_readiness: [],
      })

      expect(merged.source_readiness.find((row: any) => row.key === 'custom_editorial_source')).toMatchObject({
        status,
        evidence: '仍未就绪',
      })
    },
  )

  test('normalizes benchmark source path gaps after a character-only repair', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-final-benchmark-recall-'))
    const project = await createNovelProject(workspace, {
      title: '红雾回廊',
      genre: '规则怪谈',
      synopsis: '主角沿红雾回廊追查被替换的规则。',
      reference_config: {
        story_state: {
          current_time: '紧接第一章章尾',
          active_locations: ['红雾回廊'],
        },
      },
    })
    await createNovelWorldbuilding(workspace, {
      project_id: project.id,
      world_summary: '红雾规则被改写后会留下金色裂纹。',
      rules: ['暴力破坏规则载体会扩大红雾裂缝。'],
    })
    await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'rule',
      name: '红雾裂缝规则',
      summary: '暴力破坏规则载体会扩大红雾裂缝。',
      constraints_json: { trigger: '暴力破坏规则载体', cost: '红雾裂缝扩大' },
      state_json: {},
      payload_json: {},
    } as any)
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '规则换页',
      chapter_summary: '金色裂纹证明规则页被人替换。',
      ending_hook: '回廊尽头出现第二张规则页。',
      chapter_text: '金色裂纹沿规则页一路延伸，回廊尽头随即亮起第二张规则页。',
    })
    const benchmarkBrief = {
      selected_emotion_module: 'snake canonical 情绪模块',
      rhythm_reference: '蓄势 -> 误判 -> 反证 -> 新钩子。',
      source_paths: [],
      sourcePaths: [],
      gaps: ['source_paths_missing', 'module_rhythm_conflict'],
      recall_gaps: ['来源路径缺失', 'module_rhythm_conflict'],
      recallGaps: ['source_paths_missing', 'module_rhythm_conflict'],
    }
    const preDraftBrief = {
      confirmed_at: '2026-07-11T00:00:00.000Z',
      confirmation_source: 'test_fixture',
      benchmark_recall_brief: benchmarkBrief,
      benchmarkRecallBrief: {
        ...benchmarkBrief,
        source_paths: [],
        sourcePaths: [],
      },
      benchmark_recall_gaps: ['source_paths_missing', 'module_rhythm_conflict'],
      benchmarkRecallGaps: ['来源路径缺失', 'module_rhythm_conflict'],
      state_tracking_contract: {
        filter_rules: ['snake 状态筛选策略'],
        source_requirements: [],
        source_readiness: [
          { key: 'custom_snake_archive', label: 'snake 自定义档案', status: 'ready', evidence: 'snake 档案已读' },
        ],
      },
      stateTrackingContract: {
        filterRules: ['camel 状态筛选策略'],
        sourceRequirements: ['camel 自定义来源要求'],
        qualityChecks: ['camel 自定义质量检查'],
        revisionPriorities: ['camel 自定义修订优先级'],
        sourceReadiness: [
          { key: 'custom_camel_approval', label: 'camel 自定义审批', status: 'missing', evidence: '', fix: '等待 camel 审批' },
        ],
      },
      writePreparationBrief: {
        readinessStatus: 'needs_context',
        sourceGaps: ['stale_camel_write_preparation_gap'],
      },
      chapter_blueprint: {
        target_emotion: '压迫 -> 试探 -> 反证',
        opening_hook: '第二张规则页在主角面前自行翻开。',
        core_payoff: '主角从金色裂纹确认规则被替换。',
        content_outline: {
          cause: '主角追到回廊尽头。',
          development: '第二张规则页给出冲突答案。',
          turn: '金色裂纹证明答案同样被改写。',
          climax: '主角反推替换规则的时间。',
          ending: '裂纹指向回廊深处。',
        },
        ending_contract: {
          final_state: '主角放弃照搬旧答案。',
          unresolved_question: '谁替换了第二张规则页？',
          next_chapter_pull: '裂纹指向回廊深处。',
        },
      },
    }
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '第二张规则页',
      chapter_goal: '确认第二张规则页同样被替换。',
      chapter_summary: '主角沿金色裂纹确认第二张规则页同样被替换。',
      conflict: '照搬旧答案会让红雾裂缝扩大。',
      ending_hook: '裂纹指向回廊深处。',
      scene_list: [
        {
          scene_no: 1,
          title: '回廊尽头',
          purpose: '验证第二张规则页。',
          conflict: '旧答案会扩大红雾裂缝。',
          reader_payoff: '确认规则页被替换。',
          ending_hook: '裂纹指向回廊深处。',
        },
      ],
      raw_payload: {
        pre_draft_brief: preDraftBrief,
        preDraftBrief: {
          ...preDraftBrief,
          benchmark_recall_brief: {
            selected_emotion_module: 'camel outer 情绪模块不得覆盖 canonical snake',
            sourcePaths: ['MangaForge/manual/chapter-2/rhythm-reference'],
            gaps: ['source_paths_missing', 'camel_outer_extension_gap'],
            camel_outer_extension: { mode: 'preserve_me' },
          },
          benchmark_recall_gaps: ['来源路径缺失', 'module_rhythm_conflict'],
          benchmarkRecallGaps: ['source_paths_missing', 'module_rhythm_conflict'],
        },
      },
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      preflight: {
        checks: [{ key: 'characters', ok: false, severity: 'high' }],
        warnings: ['角色材料不足'],
      },
      chapter_target: {
        chapter_no: 2,
        title: chapter.title,
        summary: chapter.chapter_summary,
        conflict: chapter.conflict,
        ending_hook: chapter.ending_hook,
        scene_cards: chapter.scene_list,
      },
    }

    const result = await service.autoRepairChapterPreflightGaps(workspace, project, chapter, contextPackage, undefined)
    const repairedChapter = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)

    expect(result.repaired.map((item: any) => item.type)).toContain('character_created')
    expect(result.repaired.map((item: any) => item.type)).not.toContain('chapter_blueprint_updated')
    for (const storedBrief of [repairedChapter?.raw_payload?.pre_draft_brief, repairedChapter?.raw_payload?.preDraftBrief]) {
      expect(storedBrief?.benchmark_recall_brief?.source_paths).toEqual(['MangaForge/manual/chapter-2/rhythm-reference'])
      expect(storedBrief?.benchmark_recall_brief?.selected_emotion_module).toBe('snake canonical 情绪模块')
      expect(storedBrief?.benchmark_recall_brief?.camel_outer_extension).toEqual({ mode: 'preserve_me' })
      expect(storedBrief?.benchmark_recall_brief?.gaps).toEqual(expect.arrayContaining(['module_rhythm_conflict', 'camel_outer_extension_gap']))
      expect(storedBrief?.benchmarkRecallBrief).toEqual(storedBrief?.benchmark_recall_brief)
      expect(storedBrief?.benchmark_recall_gaps).toEqual(expect.arrayContaining(['module_rhythm_conflict', 'camel_outer_extension_gap']))
      expect(storedBrief?.benchmarkRecallGaps).toEqual(storedBrief?.benchmark_recall_gaps)
      expect(storedBrief?.write_preparation_brief?.source_gaps.join('｜')).not.toMatch(/source_paths_missing|来源路径.*缺/)
      expect(storedBrief?.write_preparation_brief?.source_gaps.join('｜')).toContain('module_rhythm_conflict')
      expect(storedBrief?.write_preparation_brief?.source_gaps.join('｜')).toContain('camel_outer_extension_gap')
      const stateTracking = storedBrief?.state_tracking_contract
      expect(stateTracking?.source_readiness.find((row: any) => row.key === 'custom_snake_archive')?.status).toBe('ready')
      expect(stateTracking?.source_readiness.find((row: any) => row.key === 'custom_camel_approval')).toMatchObject({ status: 'missing', fix: '等待 camel 审批' })
      expect(stateTracking?.filter_rules).toEqual(expect.arrayContaining(['snake 状态筛选策略', 'camel 状态筛选策略']))
      expect(stateTracking?.source_requirements).toContain('camel 自定义来源要求')
      expect(stateTracking?.quality_checks).toContain('camel 自定义质量检查')
      expect(stateTracking?.revision_priorities).toContain('camel 自定义修订优先级')
      expect(storedBrief?.stateTrackingContract).toEqual(stateTracking)
      expect(storedBrief?.writePreparationBrief).toEqual(storedBrief?.write_preparation_brief)
      expect(storedBrief?.writePreparationBrief?.source_gaps.join('｜')).not.toContain('stale_camel_write_preparation_gap')
    }
  })

  test('auto-repairs unattended preflight source paths, timeline readiness, and blueprint fields', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-repair-sources-'))
    const project = await createNovelProject(workspace, {
      title: '红雾电梯',
      genre: '规则怪谈',
      synopsis: '主角进入红雾规则区，发现旧规则被篡改。',
      reference_config: {},
    })
    await createNovelWorldbuilding(workspace, {
      project_id: project.id,
      world_summary: '红雾规则区会把错误解法放大成封印裂缝。',
      rules: ['规则被篡改后会留下金色符文痕迹。'],
    })
    await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '江哲',
      role_type: '主角',
      current_state: '刚踏入红雾，发现规则五被篡改。',
    })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '异常入局',
      chapter_summary: '江哲发现规则五被篡改。',
      ending_hook: '金色符文说明规则背后有人动手脚。',
      chapter_text: '江哲看见规则五下方的金色符文，随即踏入红雾。',
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '旧法失准',
      chapter_goal: '江哲进入红雾后确认旧办法不再可靠。',
      chapter_summary: '江哲进入红雾后确认旧办法不再可靠。',
      conflict: '暴力硬抗会让封印裂缝扩大。',
      ending_hook: '旧答案指向更危险的证据。',
      scene_list: [
        {
          scene_no: 1,
          title: '红雾深处',
          purpose: '承接规则五和金色符文',
          conflict: '旧办法会扩大封印裂缝',
          reader_payoff: '确认规则曾被篡改',
        },
      ],
      raw_payload: {
        pre_draft_brief: {
          benchmark_recall_gaps: ['source_paths_missing', 'module_rhythm_conflict'],
          benchmarkRecallGaps: ['来源路径缺失', 'module_rhythm_conflict'],
          benchmark_recall_brief: {
            selected_emotion_module: '调动：旧答案失效后的规则压力。',
            rhythm_reference: '蓄势 -> 误判 -> 反证 -> 新钩子。',
            source_paths: ['MangaForge/manual/chapter-2/rhythm-reference'],
            gaps: ['source_paths_missing', 'module_rhythm_conflict'],
          },
          state_tracking_contract: {
            version: 'oh_story_state_tracking_v1',
            source_requirements: [
              '本章细纲/场景卡',
              '上一章正文或上一章承接',
              '追踪/时间线.md',
            ],
            source_readiness: [
              { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '江哲进入红雾后确认旧办法不再可靠。' },
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '金色符文说明规则背后有人动手脚。' },
              { key: 'timeline_tracking', label: '追踪/时间线', status: 'warn', evidence: '', fix: '补齐追踪/时间线.md。' },
            ],
          },
        },
      },
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      preflight: {
        checks: [
          { key: 'benchmark_recall_source_paths', ok: false, severity: 'medium' },
          { key: 'source_readiness_timeline_tracking', ok: false, severity: 'medium' },
          { key: 'source_readiness_chapter_blueprint', ok: false, severity: 'high' },
        ],
        warnings: ['文风召回来源缺失', '追踪/时间线缺失', '本章细纲/蓝图缺核心字段'],
      },
      chapter_target: {
        chapter_no: 2,
        title: '旧法失准',
        summary: chapter.chapter_summary,
        conflict: chapter.conflict,
        ending_hook: chapter.ending_hook,
        scene_cards: chapter.scene_list,
      },
      continuity: {
        previous_chapter: {
          chapter_no: 1,
          title: '异常入局',
          ending_hook: '金色符文说明规则背后有人动手脚。',
          ending_excerpt: '江哲看见规则五下方的金色符文，随即踏入红雾。',
        },
      },
      story_state: {
        characters: [{ name: '江哲', current_state: { location: '红雾入口', knowledge_scope: '知道规则五被篡改' } }],
      },
    }

    await service.autoRepairChapterPreflightGaps(workspace, project, chapter, contextPackage, undefined)
    const repaired = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)
    const preDraft = repaired?.raw_payload?.pre_draft_brief || {}
    const sourceReadiness = preDraft.state_tracking_contract?.source_readiness || []
    const timelineRow = sourceReadiness.find((item: any) => item.key === 'timeline_tracking')
    const sourcePaths = preDraft.benchmark_recall_brief?.source_paths || []
    const blueprint = preDraft.chapter_blueprint || {}
    const persistedWritePreparationGaps = preDraft.write_preparation_brief?.source_gaps || []

    expect(sourcePaths.length).toBeGreaterThan(0)
    expect(sourcePaths.join('｜')).toContain('MangaForge')
    expect(persistedWritePreparationGaps.join('｜')).not.toMatch(/source_paths_missing|来源路径.*缺/)
    expect(persistedWritePreparationGaps.join('｜')).toContain('module_rhythm_conflict')
    expect(preDraft.benchmark_recall_brief?.gaps || []).not.toContain('source_paths_missing')
    expect(preDraft.benchmark_recall_brief?.gaps || []).toContain('module_rhythm_conflict')
    expect(preDraft.benchmark_recall_gaps || []).toEqual(['module_rhythm_conflict'])
    expect(preDraft.benchmarkRecallGaps || []).toEqual(['module_rhythm_conflict'])
    expect(timelineRow?.status).toBe('ready')
    expect(timelineRow?.evidence).toContain('当前时间')
    expect(timelineRow?.evidence).toContain('当前地点')
    expect(blueprint.target_emotion).toBeTruthy()
    expect(blueprint.content_outline?.cause).toBeTruthy()
    expect(blueprint.plot_lines?.logic_line).toBeTruthy()
    expect(blueprint.ending_contract?.next_chapter_pull).toBeTruthy()
    expect(preDraft.write_preparation_brief?.readiness_status).toBe('needs_context')

    const rebuiltChapters = await listNovelChapters(workspace, project.id)
    const rebuiltChapter = rebuiltChapters.find(item => item.id === chapter.id)
    const rebuiltContext = await service.buildChapterContextPackage(
      workspace,
      project,
      rebuiltChapter,
      rebuiltChapters,
      await listNovelWorldbuilding(workspace, project.id),
      await listNovelCharacters(workspace, project.id),
      await listNovelOutlines(workspace, project.id),
      await listNovelReviews(workspace, project.id),
    )
    const remainingKeys = (rebuiltContext.preflight?.checks || [])
      .filter((item: any) => !item.ok)
      .map((item: any) => item.key)
    const rebuiltWritePreparationGaps = rebuiltContext.chapter_target.write_preparation_brief?.source_gaps || []

    expect(remainingKeys).not.toContain('benchmark_recall_source_paths')
    expect(remainingKeys).not.toContain('source_readiness_timeline_tracking')
    expect(remainingKeys).not.toContain('source_readiness_chapter_blueprint')
    expect(rebuiltContext.oh_story_director.stage).toBe('pre_draft')
    expect(rebuiltContext.ohStoryDirector).toBe(rebuiltContext.oh_story_director)
    expect(rebuiltContext.oh_story_director.readiness).not.toBe('blocked')
    expect(rebuiltWritePreparationGaps.join('｜')).not.toMatch(/source_paths_missing|来源路径.*缺/)
    expect(rebuiltWritePreparationGaps.join('｜')).toContain('module_rhythm_conflict')
    if (rebuiltContext.oh_story_director.readiness === 'ready') {
      expect(rebuiltContext.oh_story_director.primary_action.key).toBe('generate_prose')
    } else {
      expect(rebuiltContext.oh_story_director.primary_action.key).toBe('repair_pre_draft_materials')
    }
    const rebuiltRepairCategories = rebuiltContext.oh_story_director.required_repairs.map((item: any) => item.category)
    const rebuiltRepairText = rebuiltContext.oh_story_director.required_repairs
      .map((item: any) => `${item.label || ''}\n${item.detail || ''}`)
      .join('\n')
    expect(rebuiltRepairText).not.toContain('文风召回来源缺失')
    expect(rebuiltRepairText).not.toContain('追踪/时间线缺失')
    expect(rebuiltRepairText).not.toContain('本章细纲/蓝图缺核心字段')
    if (rebuiltRepairCategories.includes('missing_blueprint')) {
      expect(
        rebuiltRepairText.includes('场景卡戏剧单元')
          || remainingKeys.includes('source_readiness_scene_card_goal_obstacle_change'),
      ).toBe(true)
    }
  })

  test('recomputes persisted write preparation after a worldbuilding-only repair', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-final-write-preparation-'))
    const project = await createNovelProject(workspace, {
      title: '红雾电梯',
      genre: '规则怪谈',
      synopsis: '江哲在红雾中追查被篡改的规则。',
      reference_config: {
        story_state: {
          current_time: '紧接第一章章尾',
          active_locations: ['红雾入口'],
        },
      },
    })
    await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '江哲',
      role_type: '主角',
      current_state: {
        location: '红雾入口',
        knowledge_scope: '知道规则五被篡改，但不知道幕后主使。',
      },
    })
    await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'rule',
      name: '红雾裂缝规则',
      summary: '暴力硬抗会让封印裂缝扩大。',
      constraints_json: { trigger: '暴力破坏规则载体', cost: '封印裂缝扩大' },
      state_json: {},
      payload_json: {},
    } as any)
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '异常入局',
      chapter_summary: '江哲发现规则五被篡改。',
      ending_hook: '金色符文说明规则背后有人动手脚。',
      chapter_text: '江哲看见规则五下方的金色符文，随即踏入红雾。',
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '旧法失准',
      chapter_goal: '江哲确认旧办法不再可靠。',
      chapter_summary: '江哲确认旧办法不再可靠，并把旧答案反推成危险证据。',
      conflict: '暴力硬抗会让封印裂缝扩大。',
      ending_hook: '旧答案指向更危险的证据。',
      scene_list: [
        {
          scene_no: 1,
          title: '红雾深处',
          purpose: '江哲验证旧办法为何失效。',
          conflict: '旧办法会扩大封印裂缝。',
          reader_payoff: '确认规则曾被篡改，并留下新的证据。',
          ending_hook: '旧答案指向更危险的证据。',
        },
      ],
      raw_payload: {
        pre_draft_brief: {
          confirmed_at: '2026-07-11T00:00:00.000Z',
          confirmation_source: 'test_fixture',
          chapter_blueprint: {
            target_emotion: '压迫 -> 试探 -> 反证',
            opening_hook: '旧办法在红雾中当场失效。',
            core_payoff: '江哲把失败反推成规则被篡改的证据。',
            content_outline: {
              cause: '江哲进入红雾。',
              development: '旧办法扩大裂缝。',
              turn: '失败痕迹与金色符文一致。',
              climax: '江哲确认规则被篡改。',
              ending: '旧答案指向更危险的证据。',
            },
            ending_contract: {
              final_state: '江哲放弃旧办法。',
              unresolved_question: '谁篡改了规则？',
              next_chapter_pull: '旧答案指向更危险的证据。',
            },
          },
          state_tracking_contract: {
            version: 'oh_story_state_tracking_v1',
            character_states: ['过期角色状态'],
            characterStates: ['过期角色状态 camel'],
            historical_causality: ['过期前史因果'],
            historicalCausality: ['过期前史因果 camel'],
            world_constraints: ['过期世界约束'],
            worldConstraints: ['过期世界约束 camel'],
            filter_rules: ['保留自定义状态筛选约束'],
            source_readiness: [
              { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '旧法失准蓝图已确认。' },
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '第一章金色符文章尾已读取。' },
              { key: 'context_tracking', label: '追踪/上下文', status: 'ready', evidence: '最后完成第一章，江哲已进入红雾。' },
              { key: 'timeline_tracking', label: '追踪/时间线', status: 'ready', evidence: '紧接第一章章尾，地点为红雾入口。' },
              { key: 'character_state', label: '角色状态', status: 'ready', evidence: '江哲位于红雾入口，知道规则五被篡改。' },
              { key: 'foreshadowing_history', label: '伏笔/前史', status: 'ready', evidence: '金色符文指向规则被篡改。' },
              { key: 'world_constraints', label: '世界约束', status: 'missing', evidence: '' },
            ],
            sourceReadiness: [
              { key: 'character_state', label: '角色状态', status: 'missing', evidence: '过期 camel 角色行' },
              { key: 'world_constraints', label: '世界约束', status: 'missing', evidence: '过期 camel 世界观行' },
            ],
          },
          write_preparation_brief: {
            version: 'oh_story_write_preparation_v1',
            readiness_status: 'needs_context',
            source_gaps: ['世界观｜状态=missing｜缺少世界观或核心规则'],
          },
        },
      },
    })
    const chapterWithAliases = await updateNovelChapter(workspace, chapter.id, {
      raw_payload: {
        ...(chapter.raw_payload || {}),
        preDraftBrief: {
          ...(chapter.raw_payload?.pre_draft_brief || {}),
          state_tracking_contract: {
            version: 'oh_story_state_tracking_v1',
            source_readiness: [
              { key: 'world_constraints', label: '世界约束', status: 'missing', evidence: '' },
            ],
          },
        },
      },
    } as any, { createVersion: false })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      preflight: {
        checks: [
          { key: 'worldbuilding', ok: false, severity: 'high' },
        ],
        warnings: ['世界观不足'],
      },
      chapter_target: {
        chapter_no: 2,
        title: chapter.title,
        summary: chapter.chapter_summary,
        conflict: chapter.conflict,
        ending_hook: chapter.ending_hook,
        scene_cards: chapter.scene_list,
      },
    }

    const result = await service.autoRepairChapterPreflightGaps(workspace, project, chapterWithAliases || chapter, contextPackage, undefined)
    const repairedChapters = await listNovelChapters(workspace, project.id)
    const repairedChapter = repairedChapters.find(item => item.id === chapter.id)
    const repairedStateTracking = repairedChapter?.raw_payload?.pre_draft_brief?.state_tracking_contract
    const repairedWorldConstraints = (repairedStateTracking?.source_readiness || [])
      .find((item: any) => item.key === 'world_constraints')
    const writePreparation = repairedChapter?.raw_payload?.pre_draft_brief?.write_preparation_brief

    expect(result.repaired.map((item: any) => item.type)).toContain('worldbuilding_created')
    expect(result.repaired.map((item: any) => item.type)).not.toContain('chapter_blueprint_updated')
    expect((await listNovelWorldbuilding(workspace, project.id)).length).toBe(1)
    expect(repairedWorldConstraints?.status).toBe('ready')
    expect(repairedWorldConstraints?.evidence).toContain('红雾裂缝规则')
    expect(repairedStateTracking?.character_states.join('｜')).toContain('江哲')
    expect(repairedStateTracking?.character_states.join('｜')).not.toContain('过期角色状态')
    expect(repairedStateTracking?.characterStates).toEqual(repairedStateTracking?.character_states)
    expect(repairedStateTracking?.historical_causality.join('｜')).not.toContain('过期前史因果')
    expect(repairedStateTracking?.historicalCausality).toEqual(repairedStateTracking?.historical_causality)
    expect(repairedStateTracking?.world_constraints.join('｜')).toContain('红雾裂缝规则')
    expect(repairedStateTracking?.world_constraints.join('｜')).not.toContain('过期世界约束')
    expect(repairedStateTracking?.worldConstraints).toEqual(repairedStateTracking?.world_constraints)
    expect(repairedStateTracking?.sourceReadiness).toEqual(repairedStateTracking?.source_readiness)
    expect(repairedStateTracking?.filter_rules).toContain('保留自定义状态筛选约束')
    expect(writePreparation).toBeTruthy()
    expect(writePreparation?.source_gaps).toEqual([])
    expect(writePreparation?.readiness_status).toBe('ready')

    const rebuiltContext = await service.buildChapterContextPackage(
      workspace,
      project,
      repairedChapter,
      repairedChapters,
      await listNovelWorldbuilding(workspace, project.id),
      await listNovelCharacters(workspace, project.id),
      await listNovelOutlines(workspace, project.id),
      await listNovelReviews(workspace, project.id),
    )
    const rebuiltStateTracking = rebuiltContext.chapter_target.state_tracking_contract
    const rebuiltWorldConstraints = (rebuiltStateTracking?.source_readiness || [])
      .find((item: any) => item.key === 'world_constraints')
    expect(rebuiltWorldConstraints?.status).toBe('ready')
    expect(rebuiltStateTracking?.filter_rules).toContain('保留自定义状态筛选约束')
    expect(rebuiltContext.chapter_target.write_preparation_brief?.source_gaps).toEqual([])
    expect(rebuiltContext.chapter_target.write_preparation_brief?.readiness_status).toBe('ready')
  })

  test('auto-repairs unattended preflight scene cards and tracking context gaps', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-repair-scene-cards-'))
    const project = await createNovelProject(workspace, {
      title: '红雾电梯',
      genre: '规则怪谈',
      synopsis: '主角进入红雾规则区，发现旧规则被篡改。',
      reference_config: {},
    })
    await createNovelWorldbuilding(workspace, {
      project_id: project.id,
      world_summary: '红雾规则区会把错误解法放大成封印裂缝。',
      rules: ['规则被篡改后会留下金色符文痕迹。'],
    })
    await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '江哲',
      role_type: '主角',
      current_state: {
        location: '红雾入口',
        knowledge_scope: '知道规则五被篡改，但不知道谁改了规则。',
      },
    })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '异常入局',
      chapter_summary: '江哲发现规则五被金色符文篡改。',
      ending_hook: '金色符文说明规则背后有人动手脚。',
      chapter_text: '江哲看见规则五下方的金色符文，随即踏入红雾。',
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '旧法失准',
      chapter_goal: '江哲进入红雾后确认旧办法不再可靠。',
      chapter_summary: '江哲进入红雾后确认旧办法不再可靠，并把旧答案反推成新的危险证据。',
      conflict: '暴力硬抗会让封印裂缝扩大。',
      ending_hook: '旧答案指向更危险的证据。',
      scene_list: [{ scene_no: 1, title: '红雾深处' }],
      raw_payload: {
        pre_draft_brief: {
          benchmark_recall_brief: {
            selected_emotion_module: '调动：旧答案失效后的规则压力。',
            rhythm_reference: '蓄势 -> 误判 -> 反证 -> 新钩子。',
            source_paths: [],
          },
          state_tracking_contract: {
            version: 'oh_story_state_tracking_v1',
            source_requirements: [
              '本章细纲/场景卡',
              '上一章正文或上一章承接',
              '追踪/上下文.md',
              '追踪/时间线.md',
            ],
            source_readiness: [
              { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '江哲进入红雾后确认旧办法不再可靠。' },
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '金色符文说明规则背后有人动手脚。' },
              { key: 'context_tracking', label: '追踪/上下文', status: 'warn', evidence: '', fix: '补齐追踪上下文。' },
              { key: 'timeline_tracking', label: '追踪/时间线', status: 'warn', evidence: '', fix: '补齐追踪/时间线.md。' },
            ],
          },
        },
      },
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      preflight: {
        checks: [
          { key: 'scene_cards', ok: false, severity: 'medium' },
          { key: 'benchmark_recall_source_paths', ok: false, severity: 'medium' },
          { key: 'source_readiness_context_tracking', ok: false, severity: 'medium' },
          { key: 'source_readiness_timeline_tracking', ok: false, severity: 'medium' },
          { key: 'source_readiness_chapter_blueprint', ok: false, severity: 'high' },
          { key: 'source_readiness_scene_card_goal_obstacle_change', ok: false, severity: 'high' },
        ],
        warnings: ['场景卡不足', '追踪上下文缺失', '追踪/时间线缺失', '本章细纲/蓝图缺核心字段'],
      },
      chapter_target: {
        chapter_no: 2,
        title: '旧法失准',
        summary: chapter.chapter_summary,
        conflict: chapter.conflict,
        ending_hook: chapter.ending_hook,
        scene_cards: chapter.scene_list,
      },
      continuity: {
        previous_chapter: {
          chapter_no: 1,
          title: '异常入局',
          ending_hook: '金色符文说明规则背后有人动手脚。',
          ending_excerpt: '江哲看见规则五下方的金色符文，随即踏入红雾。',
        },
      },
      story_state: {
        current_time: '承接第一章章尾之后',
        active_locations: ['红雾入口'],
        recent_state_entries: ['规则五被金色符文篡改；江哲已踏入红雾。'],
        characters: [{ name: '江哲', current_state: { location: '红雾入口', knowledge_scope: '知道规则五被篡改' } }],
      },
    }

    await service.autoRepairChapterPreflightGaps(workspace, project, chapter, contextPackage, undefined)
    const repaired = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)
    const preDraft = repaired?.raw_payload?.pre_draft_brief || {}
    const sourceReadiness = preDraft.state_tracking_contract?.source_readiness || []
    const contextRow = sourceReadiness.find((item: any) => item.key === 'context_tracking')
    const timelineRow = sourceReadiness.find((item: any) => item.key === 'timeline_tracking')
    const repairedSceneCards = repaired?.scene_list || []

    expect(contextRow?.status).toBe('ready')
    expect(contextRow?.evidence).toContain('最后完成章节')
    expect(timelineRow?.status).toBe('ready')
    expect(repairedSceneCards.length).toBeGreaterThanOrEqual(2)
    expect(repairedSceneCards.length).toBeLessThanOrEqual(6)
    for (const scene of repairedSceneCards) {
      expect(scene.purpose || scene.goal || scene.scene_goal).toBeTruthy()
      expect(scene.conflict || scene.obstacle || scene.rule_pressure).toBeTruthy()
      expect(scene.reader_payoff || scene.turning_point || scene.event_value_change || scene.exit_state || scene.state_changes_expected?.length).toBeTruthy()
    }

    const rebuiltChapters = await listNovelChapters(workspace, project.id)
    const rebuiltChapter = rebuiltChapters.find(item => item.id === chapter.id)
    const rebuiltContext = await service.buildChapterContextPackage(
      workspace,
      project,
      rebuiltChapter,
      rebuiltChapters,
      await listNovelWorldbuilding(workspace, project.id),
      await listNovelCharacters(workspace, project.id),
      await listNovelOutlines(workspace, project.id),
      await listNovelReviews(workspace, project.id),
    )
    const remainingKeys = (rebuiltContext.preflight?.checks || [])
      .filter((item: any) => !item.ok)
      .map((item: any) => item.key)

    expect(remainingKeys).not.toContain('scene_cards')
    expect(remainingKeys).not.toContain('source_readiness_context_tracking')
    expect(remainingKeys).not.toContain('source_readiness_scene_card_goal_obstacle_change')
    expect(rebuiltContext.oh_story_director.stage).toBe('pre_draft')
    expect(rebuiltContext.ohStoryDirector).toBe(rebuiltContext.oh_story_director)
  })

  test('auto-repairs scene card gaps without overflowing on cyclic scene metadata', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-repair-cyclic-scene-'))
    const project = await createNovelProject(workspace, {
      title: '红雾电梯',
      genre: '规则怪谈',
      synopsis: '主角进入红雾规则区，发现旧规则被篡改。',
      reference_config: {},
    })
    await createNovelWorldbuilding(workspace, {
      project_id: project.id,
      world_summary: '红雾规则区会把错误解法放大成封印裂缝。',
      rules: ['规则被篡改后会留下金色符文痕迹。'],
    })
    await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '江哲',
      role_type: '主角',
      current_state: { location: '红雾入口' },
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '旧法失准',
      chapter_goal: '江哲进入红雾后确认旧办法不再可靠。',
      chapter_summary: '江哲进入红雾后确认旧办法不再可靠。',
      conflict: '暴力硬抗会让封印裂缝扩大。',
      ending_hook: '旧答案指向更危险的证据。',
      scene_list: [{ scene_no: 1, title: '红雾深处' }],
    })
    const cyclicScene: any = {
      scene_no: 1,
      title: '红雾深处',
      purpose_tags: ['铺垫'],
      state_changes_expected: [],
    }
    cyclicScene.state_changes_expected.push(cyclicScene)
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    await service.autoRepairChapterPreflightGaps(workspace, project, chapter, {
      preflight: {
        checks: [
          { key: 'source_readiness_chapter_blueprint', ok: false, severity: 'high' },
          { key: 'source_readiness_scene_card_goal_obstacle_change', ok: false, severity: 'high' },
        ],
        warnings: ['场景卡戏剧单元缺口'],
      },
      chapter_target: {
        chapter_no: 2,
        title: '旧法失准',
        summary: chapter.chapter_summary,
        conflict: chapter.conflict,
        ending_hook: chapter.ending_hook,
        scene_cards: [cyclicScene],
      },
      continuity: {
        previous_chapter: {
          chapter_no: 1,
          title: '异常入局',
          ending_hook: '金色符文说明规则背后有人动手脚。',
        },
      },
      story_state: {
        recent_state_entries: ['规则五被金色符文篡改。'],
      },
    }, undefined)

    const repaired = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)
    expect(repaired?.scene_list?.length).toBeGreaterThanOrEqual(2)
    expect(repaired?.scene_list?.[0]?.state_changes_expected?.join('；') || '').toContain('确认')
    expect(() => JSON.stringify(repaired?.scene_list || [])).not.toThrow()
    expect(() => JSON.stringify(repaired?.raw_payload?.pre_draft_brief || {})).not.toThrow()
  })

  test('feeds unconfirmed unattended pre-draft brief into paragraph prose planning', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '镜城规则', genre: '规则怪谈', reference_config: {} },
      {
        pre_draft_brief: {
          scene_briefs: [
            {
              scene_no: 1,
              title: '倒悬教室',
              opening_hook: '天花板倒悬的课桌忽然点名主角。',
              reader_payoff: '主角用镜面规则反证监考人撒谎。',
              information_gap: '谁改了点名册。',
              ending_hook_seed: '粉笔灰拼出下一间教室的编号。',
            },
          ],
          reader_expectation_debt: {
            must_carry: ['镜面规则欠账必须推进'],
            keep_alive: ['点名册是谁改的要保持存在感'],
          },
          delivery_risk_carry_over: {
            items: ['上一章章末钩子不能空承接'],
            required_actions: ['开篇用倒悬教室直接承接上一章镜面异动'],
          },
          longform_battle_context: {
            status: 'warn',
            risk_items: ['核心规则解释过多，必须转成现场危险'],
          },
          story_unit_context: {
            current_chapter_role: '规则验证章',
            unit_goal: '三章内完成镜面规则第一轮验证。',
            forbidden_advance: ['不得提前揭晓点名册幕后者'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '倒悬教室',
          summary: '主角进入倒悬教室验证镜面规则。',
          conflict: '监考人试图用点名册抹掉主角身份。',
          word_target: { label: '标准章', target: 3000, min: 2600, max: 3400 },
        },
      },
      null,
      { chapter_no: 8, title: '倒悬教室' },
    )
    const planningPrompt = prompt.slice(0, prompt.indexOf('【结构化上下文包】'))

    expect(planningPrompt).toContain('前 300 字必须落地：天花板倒悬的课桌忽然点名主角')
    expect(planningPrompt).toContain('主角用镜面规则反证监考人撒谎')
    expect(planningPrompt).toContain('粉笔灰拼出下一间教室的编号')
    expect(planningPrompt).toContain('镜面规则欠账必须推进')
    expect(planningPrompt).toContain('上一章章末钩子不能空承接')
    expect(planningPrompt).toContain('核心规则解释过多，必须转成现场危险')
    expect(planningPrompt).toContain('规则验证章')
    expect(planningPrompt).toContain('不得提前揭晓点名册幕后者')
  })

  test('builds chapter context from raw camelCase pre-draft briefs for unattended prose planning', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-camel-brief-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const chapter = {
      id: 808,
      project_id: 88,
      chapter_no: 8,
      title: '倒悬教室',
      chapter_summary: '主角进入倒悬教室验证镜面规则。',
      conflict: '监考人试图用点名册抹掉主角身份。',
      ending_hook: '粉笔灰拼出下一间教室编号。',
      scene_list: [],
      raw_payload: {
        preDraftBrief: {
          previousHandoff: {
            immediateCarry: ['镜面异动必须在开篇被角色处理'],
          },
          first30RetentionBrief: {
            segmentLabel: '试读十章',
            flags: ['开篇钩子弱'],
            requiredActions: ['前300字给倒悬教室危机'],
          },
          storyUnitContext: {
            currentChapterRole: '规则验证章',
            forbiddenAdvance: ['不得提前揭晓点名册幕后者'],
          },
          recentFatigueBrief: {
            nextActions: ['减少解释，改成现场危险'],
          },
          readerExpectationDebt: {
            mustCarry: ['镜面规则欠账必须推进'],
          },
          deliveryRiskCarryOver: {
            requiredActions: ['上一章章末钩子不能空承接'],
          },
        },
      },
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      { id: 88, title: '镜城规则', genre: '规则怪谈', reference_config: {} },
      chapter,
      [
        {
          id: 807,
          chapter_no: 7,
          title: '镜面异动',
          chapter_text: '镜面忽然倒映出下一间教室。',
          ending_hook: '镜面忽然倒映出下一间教室。',
        },
        chapter,
      ],
      [],
      [],
      [],
      [],
    )

    expect(context.chapter_target.previous_handoff || '').toContain('镜面异动必须在开篇被角色处理')
    expect(context.chapter_target.first30_retention_brief?.required_actions?.join('；') || '').toContain('前300字给倒悬教室危机')
    expect(context.chapter_target.story_unit_context?.current_chapter_role || '').toBe('规则验证章')
    expect(context.chapter_target.recent_fatigue_brief?.next_actions?.join('；') || '').toContain('减少解释，改成现场危险')
    expect(context.chapter_target.reader_expectation_debt_context?.must_carry?.map((item: any) => item.text).join('；') || '').toContain('镜面规则欠账必须推进')
    expect(context.chapter_target.delivery_risk_carry_over?.required_actions?.join('；') || '').toContain('上一章章末钩子不能空承接')
    expect(context.oh_story_director.stage).toBe('pre_draft')
    expect(context.ohStoryDirector).toBe(context.oh_story_director)
    expect(['needs_repair', 'blocked']).toContain(context.oh_story_director.readiness)
    expect(['repair_pre_draft_materials', 'confirm_missing_choice']).toContain(context.oh_story_director.primary_action.key)
    expect(context.oh_story_director.required_repairs.map((item: any) => item.category)).toEqual(
      expect.arrayContaining(['missing_blueprint']),
    )
  })

  test('builds pre-draft director from final context package after override preflight is merged', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-director-override-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const chapter = {
      id: 809,
      project_id: 89,
      chapter_no: 9,
      title: '改线确认',
      chapter_summary: '主角发现旧规则可能需要改线确认。',
      conflict: '是否沿用原本主线。',
      ending_hook: '旧档案翻出反向证词。',
      scene_list: [
        {
          title: '档案室',
          goal: '找出旧规则反向证据',
          conflict: '继续主线还是改线',
          turning_point: '反向证词出现',
        },
      ],
      raw_payload: {
        context_package_override: {
          preflight: {
            ready: false,
            strict_ready: false,
            checks: [],
            blockers: [],
            warnings: ['先人工确认主线方向是否改变'],
          },
        },
      },
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      { id: 89, title: '镜城规则', genre: '规则怪谈', reference_config: {} },
      chapter,
      [chapter],
      [{ id: 1, project_id: 89, world_summary: '镜城规则会反向记录证据。', rules: ['镜面证据不可直接改写'] }],
      [{ id: 1, project_id: 89, name: '林镜', role: 'protagonist', goal: '找出镜城源头' }],
      [],
      [],
    )

    expect(context.preflight.warnings).toContain('先人工确认主线方向是否改变')
    expect(context.oh_story_director.stage).toBe('pre_draft')
    expect(context.ohStoryDirector).toBe(context.oh_story_director)
    expect(context.oh_story_director.readiness).toBe('blocked')
    expect(context.oh_story_director.primary_action.key).toBe('confirm_missing_choice')
    expect(context.oh_story_director.required_repairs).toContainEqual(expect.objectContaining({
      category: 'manual_confirmation_required',
    }))
  })

  test('sanitizes stored scene-card diagnostic noise when building chapter context', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-stored-scene-noise-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const noisyRisk = '主角必须同时保住身份、线索和身边人的安全。；同步风险开篇承接：前300字先回应 story_drive_sync 的上一章缺口；同步风险中段兑现：按 character_state_delta_sync 的 missed/next_actions 写出可见行动；下一次修订优先补足 reader_fuel_missed。'
    const chapter = {
      id: 810,
      project_id: 90,
      chapter_no: 10,
      title: '镇门危局',
      chapter_summary: '江哲在封锁令压到门前时守住身份和线索。',
      conflict: '镇门封锁会暴露江哲的异常身份。',
      ending_hook: '门外传来第二份封锁令。',
      scene_list: [
        {
          scene_no: 1,
          title: '封锁压门',
          purpose: '封锁令压到江哲门前。',
          conflict: noisyRisk,
          obstacle: noisyRisk,
          opposing_force: noisyRisk,
          no_exit_reason: `否则${noisyRisk}`,
          event_value_change: '确认同步风险开篇承接：前300字先回应 story_loop_sync 的上一章缺口。',
        },
      ],
      raw_payload: {},
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      { id: 90, title: '怪谈世界', genre: '规则怪谈', reference_config: {} },
      chapter,
      [chapter],
      [{ id: 1, project_id: 90, world_summary: '镇门封锁会放大异常身份风险。', rules: ['封锁令必须当场处理'] }],
      [{ id: 1, project_id: 90, name: '江哲', role: 'protagonist', goal: '保住身份并追出封锁源头' }],
      [],
      [],
    )
    const scene = context.chapter_target.scene_cards[0]
    const coreText = [
      scene.conflict,
      scene.obstacle,
      scene.opposing_force,
      scene.no_exit_reason,
      scene.event_value_change,
    ].join('；')

    expect(scene.conflict).toContain('主角必须同时保住身份、线索和身边人的安全')
    expect(coreText).not.toContain('同步风险')
    expect(coreText).not.toContain('_sync')
    expect(coreText).not.toContain('missed')
    expect(coreText).not.toContain('下一次修订')
  })

  test('sanitizes confirmed pre-draft scene briefs before prose context handoff', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-confirmed-scene-noise-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const noisyRisk = '江哲必须守住镇门线索。；同步风险中段兑现：按 asset_state_delta_sync 的 missed/next_actions 写出资产变化；下一次修订优先补 chapter_handoff_delta_sync。'
    const chapter = {
      id: 811,
      project_id: 91,
      chapter_no: 11,
      title: '镇门反证',
      chapter_summary: '江哲用镇门线索反证封锁令来源。',
      conflict: '封锁令来源被人伪装。',
      ending_hook: '镇门背后亮起第二枚印记。',
      scene_list: [
        {
          scene_no: 1,
          title: '干净兜底',
          purpose: '保留干净旧场景。',
          conflict: '伪装来源阻止江哲确认真相。',
        },
      ],
      raw_payload: {
        pre_draft_brief: {
          confirmed_at: '2026-07-07T10:00:00.000Z',
          scene_briefs: [
            {
              scene_no: 1,
              title: '反证封锁',
              purpose: '江哲用镇门线索反证封锁令来源。',
              conflict: noisyRisk,
              obstacle: noisyRisk,
              event_value_change: '确认同步风险开篇承接：回应 story_loop_sync。',
            },
          ],
        },
      },
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      { id: 91, title: '怪谈世界', genre: '规则怪谈', reference_config: {} },
      chapter,
      [chapter],
      [{ id: 1, project_id: 91, world_summary: '镇门印记会记录封锁令来源。', rules: ['封锁令来源不可被旁白直接解释'] }],
      [{ id: 1, project_id: 91, name: '江哲', role: 'protagonist', goal: '查出封锁令源头' }],
      [],
      [],
    )
    const scene = context.chapter_target.scene_cards[0]
    const coreText = [scene.conflict, scene.obstacle, scene.event_value_change].join('；')

    expect(scene.conflict).toContain('江哲必须守住镇门线索')
    expect(scene.event_value_change || scene.reader_payoff || scene.turning_point || scene.exit_state).toContain('局势变成下一步必须处理的新状态')
    expect(coreText).not.toContain('同步风险')
    expect(coreText).not.toContain('_sync')
    expect(coreText).not.toContain('missed')
    expect(coreText).not.toContain('下一次修订')
  })

  test('builds pre-draft core contract radar when saved fields are objects', () => {
    const brief = buildChapterPreDraftBrief(
      {
        id: 90,
        title: '旧城维修师',
        genre: '都市奇谈',
        synopsis: '主角用旧城维修规则解决异常危机。',
        reference_config: {
          writing_bible: {
            coreContractRadar: {
              summary: '旧城维修规则必须持续服务主线爽点。',
              mustServe: {
                promise: '主角用维修规则解决旧城危机',
              },
              noDrift: {
                redLine: '不得把维修主线改成纯恋爱',
              },
              repairFocus: {
                action: '第2章必须把旧钥匙变成现场证据',
              },
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '旧钥匙',
          summary: '主角拿到旧钥匙并发现维修规则。',
          conflict: '旧城管理员阻止主角检查门锁。',
          scene_cards: [
            { scene_no: 1, title: '旧钥匙', reader_payoff: '主角把旧钥匙变成现场证据。' },
          ],
        },
      },
    )

    expect(brief.core_contract_radar.must_serve).toContain('主角用维修规则解决旧城危机')
    expect(brief.core_contract_radar.no_drift).toContain('不得把维修主线改成纯恋爱')
    expect(brief.core_contract_radar.repair_focus).toContain('第2章必须把旧钥匙变成现场证据')
  })

  test('carries stored daily progress summary into built chapter context package', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-progress-summary-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      id: 89,
      title: '万古长夜',
      genre: '玄幻',
      synopsis: '李玄追查旧阵塔中的失落印章。',
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
    const chapter = {
      id: 890,
      project_id: 89,
      chapter_no: 51,
      title: '第七层旧影',
      chapter_summary: '李玄追查旧阵塔第七层的人影。',
      conflict: '守塔残影拒绝交出印章线索。',
      ending_hook: '第七层门后传来林青禾的声音。',
      scene_list: [],
      raw_payload: {},
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      project,
      chapter,
      [chapter],
      [],
      [],
      [],
      [],
    )
    const prompt = service.buildParagraphProseContext(project, context, null, chapter)

    expect(context.progress_summary?.last_completed_chapter).toBe(50)
    expect(context.chapter_target.progress_summary?.notes).toContain('旧印章归属仍不能公开')
    expect(context.story_state.progress_summary?.recent_changed_characters).toEqual(['李玄', '林青禾'])
    expect(prompt).toContain('【日更进度断点】')
    expect(prompt).toContain('最后完成章节：第50章')
    expect(prompt).toContain('最近变更角色：李玄、林青禾')
  })

  test('builds relationship graph diagnostics into chapter context for asset linkage planning', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-relationship-graph-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = await createNovelProject(workspace, {
      title: '旧城维修师',
      genre: '都市奇谈',
      reference_config: {},
    } as any)
    await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'item',
      name: '孤钥',
      summary: '只在设定池里出现、还没有绑定角色或主线的旧钥匙。',
      state_json: {},
      payload_json: {},
    } as any)
    const chapter = {
      id: 809,
      project_id: project.id,
      chapter_no: 9,
      title: '孤钥入局',
      chapter_summary: '主角发现旧钥匙能打开禁门。',
      conflict: '执事质疑旧钥匙来源。',
      ending_hook: '钥匙齿纹对上会长袖口的旧铺印记。',
      scene_list: [],
      raw_payload: {},
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      project,
      chapter,
      [chapter],
      [],
      [],
      [],
      [],
    )

    expect(context.relationship_graph.summary.isolated_key_asset_count).toBeGreaterThan(0)
    expect(context.relationship_graph.diagnostics.map((item: any) => item.entity_name)).toContain('孤钥')
    expect(context.setting_context.relationship_graph.summary.isolated_key_asset_count).toBe(context.relationship_graph.summary.isolated_key_asset_count)
  })

  test('auto-repairs missing worldbuilding before unattended prose generation', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('const needsWorldbuilding =')
    expect(repairBlock).toContain("missingKeys.includes('worldbuilding')")
    expect(repairBlock).toContain('createNovelWorldbuilding(')
    expect(repairBlock).toContain('world_summary:')
    expect(repairBlock).toContain("type: 'worldbuilding_created'")
  })

  test('uses run-level quality threshold for unattended chapter group quality gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', groupStart)
    const finalStart = source.indexOf('const finalQualityDecision =', groupStart)
    const gateBlock = source.slice(groupStart, finalStart + 260)

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(preStoreStart).toBeGreaterThan(groupStart)
    expect(finalStart).toBeGreaterThan(preStoreStart)
    expect(gateBlock).toContain('const qualityGateProject =')
    expect(gateBlock).toContain('project?.reference_config?.quality_gate?.min_score')
    expect(gateBlock).toContain('const qualityThreshold = resolveEffectiveQualityThreshold(configuredQualityThreshold, contextPackage)')
    expect(gateBlock).toContain('getQualityGateDecision(qualityGateProject')
  })

  test('reports scene-card progress as summaries instead of full card payloads', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const sceneTitlesStart = source.indexOf('scene_card_titles', groupStart)
    const sceneSuccessStart = source.lastIndexOf("await onStage('scene_cards'", sceneTitlesStart)
    const sceneSuccessBlock = source.slice(sceneSuccessStart, source.indexOf("if (!contextPackage.chapter_target.scene_cards.length", sceneSuccessStart))

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(sceneTitlesStart).toBeGreaterThan(groupStart)
    expect(sceneSuccessStart).toBeGreaterThan(groupStart)
    expect(sceneSuccessBlock).toContain('scene_card_titles')
    expect(sceneSuccessBlock).not.toContain('scene_cards: contextPackage.chapter_target.scene_cards')
  })

  test('fails visibly when the authoritative prose quality review request fails', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const qualityStart = source.indexOf('qualityLoop = await runProseQualityLoop')
    const reviewCallStart = source.indexOf("const result = await executeAgent('review-agent'", qualityStart)
    const reviseCallbackStart = source.indexOf('revise: async ({ prompt, round }) =>', reviewCallStart)
    const reviewBlock = source.slice(reviewCallStart, reviseCallbackStart)

    expect(qualityStart).toBeGreaterThanOrEqual(0)
    expect(reviewCallStart).toBeGreaterThan(qualityStart)
    expect(reviewBlock).toContain('(result as any)?.error')
    expect(reviewBlock).toContain("round > 0 ? 'PROSE_QUALITY_RECHECK_UNAVAILABLE' : 'PROSE_REVIEW_FAILED'")
    expect(reviewBlock).toContain('buildLLMResultDiagnostics(result)')
  })
  test('stops structured review fill after a batch LLM failure', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/structured-review-fill-methods.ts'), 'utf8')
    const fillStart = source.indexOf('const fillMissingStructuredReviewChecks')
    const loopStart = source.indexOf('for (const batchFields of batches)', fillStart)
    const payloadStart = source.indexOf('const payload = getNovelPayload(result)', loopStart)
    const batchGuardBlock = source.slice(loopStart, payloadStart)

    expect(fillStart).toBeGreaterThanOrEqual(0)
    expect(loopStart).toBeGreaterThan(fillStart)
    expect(payloadStart).toBeGreaterThan(loopStart)
    expect(batchGuardBlock).toContain('(result as any).error')
    expect(batchGuardBlock).toContain('structured_fill_failed')
    expect(batchGuardBlock).toContain('break')
  })

  test('uses compact prose context snapshots in review and revision prompts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptStart = source.indexOf('const buildProseReviewPrompt =')
    const revisionPromptStart = source.indexOf('const buildProseRevisionPrompt =', reviewPromptStart)
    const reviewPromptBlock = source.slice(reviewPromptStart, revisionPromptStart)
    const revisionPromptEnd = source.indexOf('const shouldReviseProse', revisionPromptStart)
    const revisionPromptBlock = source.slice(revisionPromptStart, revisionPromptEnd)

    expect(reviewPromptStart).toBeGreaterThanOrEqual(0)
    expect(revisionPromptStart).toBeGreaterThan(reviewPromptStart)
    expect(revisionPromptEnd).toBeGreaterThan(revisionPromptStart)
    expect(reviewPromptBlock).toContain('prosePromptJson(buildProsePromptContextSnapshot(contextPackage)')
    expect(reviewPromptBlock).not.toContain('JSON.stringify(contextPackage, null, 2).slice')
    expect(revisionPromptBlock).toContain('prosePromptJson(buildProsePromptContextSnapshot(contextPackage)')
    expect(revisionPromptBlock).not.toContain('JSON.stringify(contextPackage, null, 2).slice')
  })

  test('surfaces authoritative prose revision failures instead of storing the candidate', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const qualityStart = source.indexOf('qualityLoop = await runProseQualityLoop')
    const reviseStart = source.indexOf('revise: async ({ prompt, round }) =>', qualityStart)
    const qualityEnd = source.indexOf('finalText = qualityLoop.final_text', reviseStart)
    const reviseBlock = source.slice(reviseStart, qualityEnd)

    expect(reviseStart).toBeGreaterThan(qualityStart)
    expect(reviseBlock).toContain("await onStage('revise', { status: 'running', phase: 'quality_revision', round })")
    expect(reviseBlock).toContain("code: 'PROSE_REVISION_FAILED'")
    expect(reviseBlock).toContain('buildLLMResultDiagnostics(result)')
  })
  test('feeds quality gate failure reasons into the oh-story revision strategy brief', () => {
    const strategySource = readFileSync(join(import.meta.dir, '../novel-writing-service/revision/revision-strategy.ts'), 'utf8')
    const monofileSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const strategyStart = strategySource.indexOf('export function buildRevisionStrategyBrief')
    const strategyBlock = strategySource.slice(strategyStart)
    const revisionPrompt = monofileSource.slice(
      monofileSource.indexOf('const buildProseRevisionPrompt'),
      monofileSource.indexOf('const shouldReviseProse'),
    )

    expect(strategyStart).toBeGreaterThanOrEqual(0)
    expect(strategyBlock).toContain('const qualityGateFailureRisks = proseQualityGateFailureRisks(review)')
    expect(strategyBlock).toContain("field: 'quality_gate'")
    expect(revisionPrompt).toContain('若无法输出严格 JSON，也必须直接输出修订后的完整正文')
  })

  test('passes run-level quality threshold from chapter group worker into chapter generation', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-production-service.ts'), 'utf8')
    const executeStart = source.indexOf('const chapterResult = await ctx.generateChapterForGroup')
    const executeBlock = source.slice(executeStart, source.indexOf('onStage:', executeStart))

    expect(executeStart).toBeGreaterThanOrEqual(0)
    expect(executeBlock).toContain('quality_threshold: options.quality_threshold || payload.policy?.quality_threshold')
  })

  test('passes unattended worker abort signals into prose generation and repair agents', () => {
    const executorSource = readFileSync(join(import.meta.dir, '../llm/executor.ts'), 'utf8')
    const writingSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')

    const executeNovelAgentStart = executorSource.indexOf('export async function executeNovelAgent(')
    const executeNovelAgentBlock = executorSource.slice(executeNovelAgentStart, executorSource.indexOf('export function resolveAgentPreferredModelId', executeNovelAgentStart + 1))
    const generateProseStart = executorSource.indexOf('export async function generateNovelChapterProse(')
    const generateProseBlock = executorSource.slice(generateProseStart, executorSource.indexOf('// ── Init Memory Palace', generateProseStart))
    const generateChapterStart = writingSource.indexOf('const generateChapterForGroup = async')
    const generateChapterBlock = writingSource.slice(generateChapterStart, writingSource.length)

    expect(executeNovelAgentStart).toBeGreaterThanOrEqual(0)
    expect(executeNovelAgentBlock).toContain('signal?: AbortSignal')
    expect(executeNovelAgentBlock).toContain('timeoutMs?: number')
    expect(executeNovelAgentBlock).toContain('signal: options.signal')
    expect(generateProseBlock).toContain('signal: (context as any).abortSignal')
    expect(generateProseBlock).toContain('timeoutMs: (context as any).llmTimeoutMs')
    expect(generateChapterBlock).toContain('abortSignal: options.abortSignal')
    expect(generateChapterBlock).toContain('llmTimeoutMs: options.llmTimeoutMs')
    expect(generateChapterBlock).toContain('signal: options.abortSignal')
  })

  test('passes compact previous chapter handoffs into prose draft generation', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const utilsSource = readFileSync(join(import.meta.dir, 'novel-route-utils.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup = async')
    const prevChaptersStart = source.indexOf('const prevChapters = compactPreviousChaptersForProse', groupStart)
    const draftCallStart = source.indexOf('const draftResult = await generateNovelChapterProse', prevChaptersStart)
    const previousChapterBlock = source.slice(prevChaptersStart, draftCallStart)
    const draftCallBlock = source.slice(draftCallStart, source.indexOf('const resultPayload = getNovelPayload', draftCallStart))
    const helperStart = utilsSource.indexOf('export function compactPreviousChaptersForProse')
    const helperBlock = utilsSource.slice(helperStart, utilsSource.indexOf('export const COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS', helperStart))

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(prevChaptersStart).toBeGreaterThan(groupStart)
    expect(draftCallStart).toBeGreaterThan(prevChaptersStart)
    expect(helperStart).toBeGreaterThanOrEqual(0)
    expect(previousChapterBlock).toContain('compactPreviousChaptersForProse')
    expect(previousChapterBlock).not.toContain('chapter_text: ch.chapter_text')
    expect(helperBlock).toContain('ending_excerpt')
    expect(helperBlock).toContain('chapter_text: endingExcerpt')
    expect(helperBlock).not.toContain('chapter_text: chapter.chapter_text')
    expect(draftCallBlock).toContain('prevChapters')
    expect(draftCallBlock).toContain('paragraphTask: compiledPrompt.prompt')
    expect(draftCallBlock).toContain('boundedProseContract: true')
  })

  test('checks abort signal between expensive chapter prose pipeline stages', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const serviceReturn = source.indexOf('\n  return {\n    generateChapterForGroup,', groupStart)
    const groupBlock = source.slice(groupStart, serviceReturn)
    const checkpoints = groupBlock.match(/throwIfChapterGenerationAborted\(\)/g) || []

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(serviceReturn).toBeGreaterThan(groupStart)
    expect(groupBlock).toContain('const throwIfChapterGenerationAborted = () => throwIfAborted(llmControlOptions)')
    expect(checkpoints.length).toBeGreaterThanOrEqual(14)
    expect(groupBlock).toContain('throwIfChapterGenerationAborted()')
    expect(groupBlock).toContain('const compiledPrompt = compileParagraphProseContext')
    expect(groupBlock).toContain("await onStage('editor', { status: 'running' })")
    expect(groupBlock).toContain("await onStage('meme_polish', { status: 'running' })")
    expect(groupBlock).toContain('throwIfChapterGenerationAborted()')
    expect(groupBlock).toContain("await onStage('review'")
    expect(groupBlock).toContain("await onStage('story_state', { status: 'running', phase: 'prepare' })")
    expect(groupBlock).toContain('runtime?.hooks?.beforeStoryState')
    expect(groupBlock).toContain('preparedStoryStateUpdate = await prepareStoryStateUpdate(')
    expect(groupBlock).toContain('preferredModelId,\n      llmControlOptions,')
    expect(groupBlock).toContain('throwIfChapterGenerationAborted()')
    expect(groupBlock).toContain('validateMinimalChapterProse(finalText)')
    expect(groupBlock).toContain('throwIfChapterGenerationAborted()')
    expect(groupBlock).toContain('commitNovelChapterAcceptance')
  })

  test('defers non-blocking readability review without weakening core oh-story gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const selfReviewStart = source.indexOf('let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>', groupStart)
    const readabilityStart = source.indexOf('if (shouldRunSynchronousReadabilityReview(options, project))', selfReviewStart)
    const qualityGateStart = source.indexOf('const preStoreQualityDecision = getQualityGateDecision', selfReviewStart)
    const readabilityBlock = source.slice(readabilityStart, source.indexOf('let proseRevisionReceiptSync', readabilityStart))

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(selfReviewStart).toBeGreaterThan(groupStart)
    expect(readabilityStart).toBeGreaterThan(selfReviewStart)
    expect(qualityGateStart).toBeGreaterThan(readabilityStart)
    expect(readabilityBlock).toContain('shouldRunSynchronousReadabilityReview(options, project)')
    expect(readabilityBlock).toContain("status: 'skipped'")
    expect(readabilityBlock).toContain('deferred: true')
    expect(readabilityBlock).toContain('run_readability_review')
  })

  test('keeps aborted unattended chapters resumable instead of consuming retry attempts', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-production-service.ts'), 'utf8')
    const catchStart = source.indexOf('} catch (chapterError: any) {')
    const catchBlock = source.slice(catchStart, source.indexOf('const failedStages =', catchStart))

    expect(catchStart).toBeGreaterThanOrEqual(0)
    expect(source).toContain('function isAbortLikeError')
    expect(catchBlock).toContain('options.abortSignal?.aborted || isAbortLikeError(chapterError)')
    expect(catchBlock).toContain("status: 'ready'")
    expect(catchBlock).toContain("error_code: 'REQUEST_CANCELED'")
    expect(catchBlock).toContain("phase: `第${item.chapter_no}章已停止，可继续执行`")
  })

  test('passes oh-story revision strategy brief into prose revision prompt', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(revisionPrompt).toContain('const revisionStrategyBrief = buildRevisionStrategyBrief(review)')
    expect(revisionPrompt).toContain('【oh-story 精修策略简报 revision_strategy_brief】')
    expect(revisionPrompt).toContain('primary_strategy')
    expect(revisionPrompt).toContain('rewrite/compress/de_ai/polish')
  })

  test('asks prose revision to execute oh-story three-pass de-ai method', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(revisionPrompt).toContain('系统性去AI三遍法')
    expect(revisionPrompt).toContain('Pass 1：去泛化')
    expect(revisionPrompt).toContain('抽象情绪总结句')
    expect(revisionPrompt).toContain('工整对比句式')
    expect(revisionPrompt).toContain('Pass 2：去书面化')
    expect(revisionPrompt).toContain('机制/结构/逻辑/体系')
    expect(revisionPrompt).toContain('进一步/深入/推进/落实')
    expect(revisionPrompt).toContain('Pass 3：回自然感')
    expect(revisionPrompt).toContain('角色说话方式的区分')
    expect(revisionPrompt).toContain('长短句交错')
    expect(revisionPrompt).toContain('轻度只做 Pass 1')
    expect(revisionPrompt).toContain('中度做 Pass 1 + Pass 2')
    expect(revisionPrompt).toContain('重度完整三遍')
  })

  test('disables unattended quality regeneration so warnings can advance without retry loops', () => {
    const routeSource = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const productionSource = readFileSync(join(import.meta.dir, 'novel-production-service.ts'), 'utf8')
    const unattendedStart = routeSource.indexOf("mode: 'unattended_goal'")
    const unattendedBlock = routeSource.slice(unattendedStart, routeSource.indexOf('const run = await appendNovelRun', unattendedStart))
    const executeStart = productionSource.indexOf('const chapterResult = await ctx.generateChapterForGroup')
    const executeBlock = productionSource.slice(executeStart, productionSource.indexOf('onStage:', executeStart))

    expect(unattendedStart).toBeGreaterThanOrEqual(0)
    expect(unattendedBlock).toContain('auto_repair_quality_gate: false')
    expect(executeBlock).toContain('auto_repair_quality_gate: false')
  })

  test('checks the chapter blueprint contract during prose self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )

    expect(reviewPrompt).toContain('chapter_target.chapter_blueprint')
    expect(reviewPrompt).toContain('五段式内容概括')
    expect(reviewPrompt).toContain('情节点功能标签')
    expect(reviewPrompt).toContain('写作工程词混入正文')
  })

  test('checks oh-story quick natural prose checklist during prose self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )

    expect(reviewPrompt).toContain('oh-story 快速自检口诀')
    expect(reviewPrompt).toContain('一事一段，镜头自然断')
    expect(reviewPrompt).toContain('对话要像人说话')
    expect(reviewPrompt).toContain('心情不写心里话')
    expect(reviewPrompt).toContain('章尾不搞大升华')
    expect(reviewPrompt).toContain('打斗不写流水账')
    expect(reviewPrompt).toContain('prose_craft_checks')
  })

  test('checks delivery risk carry-over during prose self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )

    expect(reviewPrompt).toContain('chapter_target.delivery_risk_carry_over')
    expect(reviewPrompt).toContain('batch_preflight.delivery_risk_carry_over')
    expect(reviewPrompt).toContain('required_actions')
    expect(reviewPrompt).toContain('opening_actions')
    expect(reviewPrompt).toContain('middle_actions')
    expect(reviewPrompt).toContain('ending_actions')
    expect(reviewPrompt).toContain('delivery_risk_receipts')
    expect(reviewPrompt).toContain('每个 items/required_actions/opening_actions/middle_actions/ending_actions')
    expect(reviewPrompt).toContain('承接动作')
    expect(reviewPrompt).toContain('分段承接动作')
    expect(reviewPrompt).toContain('新资产入库')
    expect(reviewPrompt).toContain('IP场面延展')
    expect(reviewPrompt).toContain('未兑现必须输出 S1/S2 finding')
  })

  test('checks safe batch creation contract carry-over during prose self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )

    expect(reviewPrompt).toContain('batch_preflight.delivery_risk_carry_over.creation_contract_carry_over')
    expect(reviewPrompt).toContain('目标读者、题材定位、核心承诺、追读留存')
    expect(reviewPrompt).toContain('必须输出 target_reader_checks、genre_positioning_checks、core_contract_checks 和 reader_retention_checks')
    expect(reviewPrompt).toContain('不能只用 delivery_risk_receipts 汇总')
  })

  test('keeps core contract checks in normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )
    const structuredFieldsSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/structured-review-fields.ts'), 'utf8')
    const structuredFieldsBlock = structuredFieldsSource.slice(
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_CHECK_FIELDS'),
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_REQUIRED_FIELDS'),
    )

    expect(reviewPrompt).toContain('core_contract_checks(array)')
    expect(structuredFieldsBlock).toContain("['core_contract_checks', 'coreContractChecks']")
    expect(reviewBlock).toContain('const deterministicCoreContractChecks = [buildCoreContractDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('core_contract_checks: [...reviewChecks')
    expect(reviewBlock).toContain('...deterministicCoreContractChecks')
  })

  test('wires deterministic hard-risk summaries into remaining normalized self review checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueHardChecks = [buildDialogueDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('const deterministicCharacterBehaviorChecks = [buildCharacterBehaviorDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toMatch(/const deterministicEmotionalArcChecks = \[buildEmotionalArcDeterministicCheck\(chapterText, \{[\s\S]*scanEmotionalStasisRisks[\s\S]*scanDownwardSafetyRisks[\s\S]*scanOppressionPurposeRisks[\s\S]*scanPayoffDensityRisks[\s\S]*scanPayoffEscalationRisks[\s\S]*scanTrumpCardEffectRisks/)
    expect(reviewBlock).toContain('const deterministicSuspenseHardChecks = [buildSuspenseDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('const deterministicReversalHardChecks = [buildReversalDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('const deterministicShowdownHardChecks = [buildShowdownDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('const deterministicBridgeUnitChecks = [buildBridgeUnitDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('const deterministicProseCraftHardChecks = [buildProseCraftDeterministicCheck(contextPackage, chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('const deterministicPunctuationToneHardChecks = [buildPunctuationToneDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('const deterministicQualityAuditHardChecks = [buildQualityAuditDeterministicCheck(contextPackage, chapterText)].filter(Boolean)')

    expect(reviewBlock).toContain('...deterministicDialogueHardChecks')
    expect(reviewBlock).toContain('...deterministicCharacterBehaviorChecks')
    expect(reviewBlock).toContain('...deterministicEmotionalArcChecks')
    expect(reviewBlock).toContain('...deterministicSuspenseHardChecks')
    expect(reviewBlock).toContain('...deterministicReversalHardChecks')
    expect(reviewBlock).toContain('...deterministicShowdownHardChecks')
    expect(reviewBlock).toContain('...deterministicBridgeUnitChecks')
    expect(reviewBlock).toContain('...deterministicProseCraftHardChecks')
    expect(reviewBlock).toContain('...deterministicPunctuationToneHardChecks')
    expect(reviewBlock).toContain('...deterministicQualityAuditHardChecks')
  })

  test('wires chapter and paragraph hook deterministic summaries into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain("const deterministicOpeningHookHardChecks = [buildChapterHookDeterministicCheck(")
    expect(reviewBlock).toContain("const deterministicEndingHookHardChecks = [buildChapterHookDeterministicCheck(")
    expect(reviewBlock).toContain("const deterministicOpeningHookEchoHardChecks = [buildChapterHookDeterministicCheck(")
    expect(reviewBlock).toContain('const deterministicParagraphHookHardChecks = [buildParagraphHookDeterministicCheck(')
    expect(reviewBlock).toContain('...deterministicOpeningHookHardChecks')
    expect(reviewBlock).toContain('...deterministicEndingHookHardChecks')
    expect(reviewBlock).toContain('...deterministicOpeningHookEchoHardChecks')
    expect(reviewBlock).toContain('...deterministicParagraphHookHardChecks')
  })

  test('keeps delivery risk receipts from prose self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedDeslopChecks = ['),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedDeslopChecks = [')),
    )

    expect(reviewNormalizeBlock).toContain('delivery_risk_receipts')
    expect(reviewNormalizeBlock).toContain('normalizeDeliveryRiskReceipts(reviewPayload, contextPackage, chapterText)')
    const deliveryRiskSource = [
      source,
      readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delivery-risk-core.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, '../novel-writing-service/quality/review-fill.ts'), 'utf8'),
    ].join('\n')
    expect(deliveryRiskSource).toContain('reviewPayload?.delivery_risk_receipts')
    expect(deliveryRiskSource).toContain('reviewPayload?.deliveryRiskReceipts')
  })

  test('builds artifact protocol receipt sync from oh-story project artifact receipts', () => {
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
                required_fields: ['内容概括', '情节安排', '情节细化', '结尾设定和钩子'],
                evidence: '禁库门牌从账册夹层里掉出来，沈霜立刻改变证词。',
              },
            ],
          },
        },
      },
      '禁库门牌从账册夹层里掉出来，沈霜立刻改变证词。',
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].artifact_path).toBe('大纲/细纲_第012章.md')
    expect(report.missed[0].missing_fields).toContain('人物关系和出场顺序')
    expect(report.next_actions.join('｜')).toContain('artifact_protocol_receipts')
  })

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

  test('scans direct feeling-telling phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '她感到害怕，手指停在门锁边。',
      '他感到无比不安，广播里的名字还在重复。',
      '她摸到门把手发冷，立刻把手缩回来。',
    ].join('\n'))

    const feelingHits = hits.filter((item: any) => item.pattern === '他/她感到……')
    expect(feelingHits).toHaveLength(2)
    expect(feelingHits[0].evidence).toContain('感到害怕')
    expect(feelingHits[1].evidence).toContain('感到无比不安')
    expect(feelingHits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(feelingHits.map((item: any) => item.fix).join('｜')).toContain('身体动作')
    expect(hits.some((item: any) => item.evidence.includes('摸到门把手'))).toBe(false)
  })

  test('scans direct realization-telling phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '他意识到事情不对，广播里的名字少了一个。',
      '她明白账本不是警告，而是筛选。',
      '“我意识到你在保护我。”林青禾把伞递过去。',
    ].join('\n'))

    const realizationHits = hits.filter((item: any) => item.pattern === '他/她意识到……')
    expect(realizationHits).toHaveLength(2)
    expect(realizationHits[0].evidence).toContain('意识到事情不对')
    expect(realizationHits[1].evidence).toContain('明白账本')
    expect(realizationHits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(realizationHits.map((item: any) => item.fix).join('｜')).toContain('现场证据')
    expect(hits.some((item: any) => item.evidence.includes('我意识到你在保护我'))).toBe(false)
  })

  test('scans contrast template phrasing into deslop gate checks', () => {
    const hits = scanBannedWordLeaks([
      '这并非巧合，而是有人提前清理了现场。',
      '与其说他在退让，不如说他在等门外那个人犯错。',
      '走廊看似安静，实则每盏灯都换过位置。',
    ].join('\n'))

    const patterns = hits.map((item: any) => item.pattern)
    expect(patterns).toEqual(expect.arrayContaining([
      '并非A，而是B',
      '与其说A，不如说B',
      '看似A，实则B',
    ]))
    expect(hits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(hits.every((item: any) => item.status === 'fail')).toBe(true)
    expect(hits.map((item: any) => item.fix).join('｜')).toContain('删掉对照解释')
  })

  test('detects weak adverb density as an oh-story AI signature', () => {
    const hits = scanWeakAdverbDensityRisks([
      '第15章 第四张名单',
      '李辰微微侧身。',
      '她淡淡开口。',
      '门缝缓缓合上。',
      '管理员轻轻敲了两下。',
      '字'.repeat(1000),
    ].join('\n'))

    expect(hits).toHaveLength(1)
    expect(hits[0].gate).toBe('A')
    expect(hits[0].pattern).toContain('弱化副词密度')
    expect(hits[0].evidence).toContain('4 次')
    expect(hits[0].fix).toContain('每1000字不超过 3 个')
  })

  test('detects high-frequency context-sensitive transition words as oh-story AI signature', () => {
    const hits = scanContextSensitiveWordDensityRisks([
      '第15章 第四张名单',
      '门外突然响了一声。',
      '名单好像自己翻到第二页。',
      '灯光瞬间压下来。',
      '广播突然换成倒放。',
      '钥匙好像在掌心发烫。',
      '锁孔瞬间合拢。',
      '字'.repeat(1000),
    ].join('\n'))
    const safeHits = scanContextSensitiveWordDensityRisks([
      '第15章 第四张名单',
      '门外突然响了一声。',
      '字'.repeat(1000),
    ].join('\n'))

    expect(hits).toHaveLength(1)
    expect(hits[0].gate).toBe('A')
    expect(hits[0].pattern).toContain('语境敏感词密度')
    expect(hits[0].evidence).toContain('突然 2')
    expect(hits[0].evidence).toContain('好像 2')
    expect(hits[0].evidence).toContain('瞬间 2')
    expect(hits[0].fix).toContain('角色口语')
    expect(safeHits).toHaveLength(0)
  })

  test('scans bookish phrasing into Gate A colloquial replacement checks', () => {
    const hits = scanBannedWordLeaks([
      '他的防线在那句话里彻底瓦解。',
      '一股无名火从胸口窜上来。',
      '这句话像往我心上捅刀子。',
      '李辰无可奈何地把钥匙交了出去。',
    ].join('\n'))

    const bookishHits = hits.filter((item: any) => item.pattern === '书面腔口语化')
    expect(bookishHits).toHaveLength(4)
    expect(bookishHits[0].evidence).toContain('瓦解')
    expect(bookishHits[0].fix).toContain('散了')
    expect(bookishHits[1].evidence).toContain('无名火')
    expect(bookishHits[1].fix).toContain('烦躁')
    expect(bookishHits[2].evidence).toContain('往我心上捅刀子')
    expect(bookishHits[2].fix).toContain('心烦意乱')
    expect(bookishHits[3].evidence).toContain('无可奈何')
    expect(bookishHits[3].fix).toContain('没办法')
    expect(bookishHits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('scans formulaic AI weather description from oh-story rewrite examples', () => {
    const hits = scanBannedWordLeaks([
      '天空阴沉沉的，乌云密布，随时都会下起倾盆大雨。',
      '寒风呼啸而过，刺骨的寒意钻进每个人衣领。',
    ].join('\n'))

    const weatherHits = hits.filter((item: any) => item.pattern === 'AI风天气套话')
    expect(weatherHits).toHaveLength(2)
    expect(weatherHits[0].evidence).toContain('乌云密布')
    expect(weatherHits[0].fix).toContain('晾在外面的衣服')
    expect(weatherHits[1].evidence).toContain('寒风呼啸')
    expect(weatherHits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('scans formulaic AI scene atmosphere from oh-story rewrite examples', () => {
    const hits = scanBannedWordLeaks([
      '阳光透过窗帘的缝隙洒进来，在地板上投下斑驳的光影。',
      '空气中弥漫着花香，整个世界都沉浸在一片宁静祥和的氛围中。',
    ].join('\n'))

    const sceneHits = hits.filter((item: any) => item.pattern === 'AI风场景套话')
    expect(sceneHits).toHaveLength(2)
    expect(sceneHits[0].evidence).toContain('斑驳的光影')
    expect(sceneHits[0].fix).toContain('客厅里只有钟在走')
    expect(sceneHits[1].evidence).toContain('宁静祥和')
    expect(sceneHits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('scans formulaic AI combat description from oh-story rewrite examples', () => {
    const hits = scanBannedWordLeaks([
      '他的拳势疾风骤雨，每一击都带着压迫性的力量。',
      '对手没料到如此凌厉的攻势，只能连连后退。',
    ].join('\n'))

    const combatHits = hits.filter((item: any) => item.pattern === 'AI风打斗套话')
    expect(combatHits).toHaveLength(2)
    expect(combatHits[0].evidence).toContain('疾风骤雨')
    expect(combatHits[0].fix).toContain('一拳怼过去')
    expect(combatHits[1].evidence).toContain('凌厉的攻势')
    expect(combatHits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('merges deterministic oh-story banned word scan into deslop checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedDeslopChecks = ['),
      source.indexOf('const normalizedReview = {', source.indexOf('const normalizedDeslopChecks = [')),
    )

    expect(source).toContain('const deterministicBannedWordChecks = scanBannedWordLeaks(chapterText)')
    expect(source).toContain('const deterministicWeakAdverbDensityChecks = scanWeakAdverbDensityRisks(chapterText)')
    expect(source).toContain('const deterministicContextSensitiveWordDensityChecks = scanContextSensitiveWordDensityRisks(chapterText)')
    expect(reviewNormalizeBlock).toContain('deslop_checks')
    expect(reviewNormalizeBlock).toContain('...deterministicBannedWordChecks')
    expect(reviewNormalizeBlock).toContain('...deterministicWeakAdverbDensityChecks')
    expect(reviewNormalizeBlock).toContain('...deterministicContextSensitiveWordDensityChecks')
  })

  test('builds deterministic prose cleanup report from hard text scans', () => {
    const report = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, '第三章 风起\n上一章的伏笔还没有结束……他缓缓抬头，眼中闪过一丝迟疑！！！')

    expect(report.status).toBe('warn')
    expect(report.risk_count).toBeGreaterThanOrEqual(4)
    expect(report.categories.map((item: any) => item.type)).toEqual(expect.arrayContaining([
      'prose_meta',
      'deslop',
      'punctuation_tone',
    ]))
    expect(report.priority_repair).toBe('优先清理工程词')
    expect(report.required_actions.join('｜')).toContain('角色当下能感知')
    expect(report.evidence.join('｜')).toContain('上一章的伏笔')
  })

  test('detects model degeneration risks with deterministic blocking and advisory severity', () => {
    const checks = scanModelDegenerationRisks([
      '第三章 风起',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '任务描述：继续生成本章正文。',
      '作为AI，我无法继续生成本章。',
      '门缝里只剩',
    ].join('\n'))

    expect(checks.map((item: any) => item.type)).toEqual(expect.arrayContaining([
      'repetition',
      'engineering_meta',
      'ai_self_reference',
      'truncation',
    ]))
    expect(checks.filter((item: any) => item.severity === 'blocking').map((item: any) => item.type)).toEqual(expect.arrayContaining([
      'repetition',
      'engineering_meta',
      'ai_self_reference',
      'truncation',
    ]))
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('重写受影响段落')
  })

  test('includes model degeneration as the first deterministic cleanup priority', () => {
    const report = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, [
      '第三章 风起',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '任务描述：继续生成本章正文。',
      '门缝里只剩',
    ].join('\n'))

    expect(report.status).toBe('warn')
    expect(report.categories.map((item: any) => item.type)).toContain('model_degeneration')
    expect(report.priority_repair).toBe('优先处理模型退化')
    expect(report.required_actions.join('｜')).toContain('重写受影响段落')
    expect(report.evidence.join('｜')).toContain('任务描述')
  })

  test('revision prompt uses delete-first deslop repair before polishing', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionStart = source.indexOf('const buildProseRevisionPrompt =')
    const revisionEnd = source.indexOf('const nextChapterQualityPlanNeedsRepair =', revisionStart)
    const revisionBlock = source.slice(revisionStart, revisionEnd)

    expect(revisionStart).toBeGreaterThanOrEqual(0)
    expect(revisionBlock).toContain('删除优先')
    expect(revisionBlock).toContain('删后不丢伏笔')
    expect(revisionBlock).toContain('删不掉才润色')
    expect(revisionBlock).toContain('跌破字数下限')
  })

  test('ignores yaml front matter when building deterministic prose cleanup report', () => {
    const report = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, [
      '---',
      'title: 上一章……旧案未结',
      'range: 7 - 9',
      'style: **draft**',
      '---',
      '第三章 风起',
      '门外的影子动了一下。',
      '她把账册压回抽屉。',
    ].join('\n'))

    expect(report.status).toBe('ok')
    expect(report.risk_count).toBe(0)
    expect(report.evidence.join('｜')).not.toContain('上一章')
    expect(report.evidence.join('｜')).not.toContain('……')
    expect(report.evidence.join('｜')).not.toContain('**draft**')
  })

  test('normalizes oh-story hard punctuation before deterministic cleanup scans', () => {
    const result = normalizeDeterministicProsePunctuation([
      '第三章 风起',
      '',
      '他停了……门外的影子动了——又像没动。',
      '她看了看3-5号门--都锁着。',
      '守卫从7 - 9号廊桥退回来。',
      '火光在10—12层之间跳了一下。',
      '真相……原来账册不是证据。',
      '他停了……。影子动了……，又停下。',
      '他把账册按在桌上……',
      '他停了。……影子动了。',
      '……他抬头看向门外。',
      '他停了…门开了。',
      '他停下---门开了。',
      '---',
      '「别动……」',
      '「……别动」',
    ].join('\n'))

    expect(result.text).toContain('他停了，门外的影子动了，又像没动。')
    expect(result.text).toContain('她看了看3到5号门，都锁着。')
    expect(result.text).toContain('守卫从7到9号廊桥退回来。')
    expect(result.text).toContain('火光在10到12层之间跳了一下。')
    expect(result.text).toContain('真相：原来账册不是证据。')
    expect(result.text).toContain('他停了。影子动了，又停下。')
    expect(result.text).toContain('他把账册按在桌上。')
    expect(result.text).toContain('他停了。影子动了。')
    expect(result.text).toContain('他抬头看向门外。')
    expect(result.text).toContain('他停了，门开了。')
    expect(result.text).toContain('他停下，门开了。')
    expect(result.text).toContain('「别动。」')
    expect(result.text).toContain('「别动」')
    expect(result.text).not.toContain('「，')
    expect(result.text).not.toContain('，」')
    expect(result.text).not.toContain('，。')
    expect(result.text).not.toContain('，，')
    expect(result.text).not.toContain('，\n')
    expect(result.text).not.toContain('。，')
    expect(result.text).not.toContain('\n，')
    expect(result.text).not.toContain('……')
    expect(result.text).not.toContain('…')
    expect(result.text).not.toContain('——')
    expect(result.text).not.toContain('--')
    expect(result.text).not.toContain('-门')
    expect(result.text.split('\n')).not.toContain('---')
    expect(result.changed).toBe(true)
    expect(result.change_count).toBeGreaterThanOrEqual(4)
    expect(result.rules).toEqual(expect.arrayContaining([
      'ellipsis_to_comma',
      'dash_to_comma',
      'leading_pause_removed',
      'numeric_range_to_chinese',
      'closing_quote_pause_to_period',
      'explanation_pause_to_colon',
      'opening_pause_removed',
      'punctuation_adjacent_pause_removed',
      'standalone_rule_line_removed',
      'terminal_pause_to_period',
    ]))
  })

  test('preserves yaml front matter while normalizing deterministic prose punctuation', () => {
    const result = normalizeDeterministicProsePunctuation([
      '---',
      'title: 旧案……未结',
      'range: 7 - 9',
      'dash: a--b',
      '---',
      '第三章 风起',
      '他停了……门外的影子动了。',
      '---',
    ].join('\n'))

    expect(result.text).toBe([
      '---',
      'title: 旧案……未结',
      'range: 7 - 9',
      'dash: a--b',
      '---',
      '第三章 风起',
      '他停了，门外的影子动了。',
      '',
    ].join('\n'))
    expect(result.changed).toBe(true)
    expect(result.rules).toEqual(expect.arrayContaining([
      'ellipsis_to_comma',
      'standalone_rule_line_removed',
    ]))
    expect(result.rules).not.toContain('numeric_range_to_chinese')
  })

  test('preserves fenced blocks while normalizing deterministic prose punctuation', () => {
    const result = normalizeDeterministicProsePunctuation([
      '第三章 风起',
      '```note',
      '引用：他停了……这里不是正文。',
      'range: 7 - 9',
      'dash: a--b',
      '```',
      '他停了……门外的影子动了。',
      '---',
    ].join('\n'))

    expect(result.text).toBe([
      '第三章 风起',
      '```note',
      '引用：他停了……这里不是正文。',
      'range: 7 - 9',
      'dash: a--b',
      '```',
      '他停了，门外的影子动了。',
      '',
    ].join('\n'))
    expect(result.changed).toBe(true)
    expect(result.rules).toEqual(expect.arrayContaining([
      'ellipsis_to_comma',
      'standalone_rule_line_removed',
    ]))
    expect(result.rules).not.toContain('numeric_range_to_chinese')
  })

  test('detects oh-story prose format violations before relying on model self review', () => {
    const checks = scanProseFormatRisks([
      '第三章 风起',
      '他停在门口。',
      '',
      '',
      '　　门外的影子动了一下。',
      '**这不是正文应该保留的加粗标记。**',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'format_blank_line_4',
      'format_indentation_line_5',
      'format_markdown_line_6',
    ]))
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('合并多余空行')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('删除正文 Markdown')
  })

  test('detects mixed chapter marker styles as prose format risks', () => {
    const checks = scanProseFormatRisks([
      '###1.',
      '门外传来第一声敲门。',
      '###第二章',
      '广播改了规则。',
      '3.',
      '名单上多出一个名字。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('format_chapter_marker_mixed')
    expect(checks[0].label).toBe('章节标记格式扫描')
    expect(checks[0].evidence).toContain('###1.')
    expect(checks[0].evidence).toContain('###第二章')
    expect(checks[0].evidence).toContain('3.')
    expect(checks[0].fix).toContain('全文统一一种章节标记格式')
  })

  test('normalizes oh-story prose format before deterministic cleanup scans', () => {
    const result = normalizeDeterministicProseFormat([
      '第三章 风起',
      '',
      '　　门外的影子动了一下。',
      '**他把门推开。**',
      '> 走廊里没有脚步声。',
      '- 水迹停在门缝外。',
    ].join('\n'))

    expect(result.text).toBe([
      '第三章 风起',
      '',
      '门外的影子动了一下。',
      '他把门推开。',
      '走廊里没有脚步声。',
      '水迹停在门缝外。',
    ].join('\n'))
    expect(result.changed).toBe(true)
    expect(result.change_count).toBeGreaterThanOrEqual(4)
    expect(result.rules).toEqual(expect.arrayContaining([
      'indentation_removed',
      'markdown_bold_removed',
      'markdown_quote_marker_removed',
      'markdown_list_marker_removed',
    ]))
    expect(scanProseFormatRisks(result.text)).toHaveLength(0)
  })

  test('preserves yaml front matter while normalizing deterministic prose format', () => {
    const result = normalizeDeterministicProseFormat([
      '---',
      'title: **旧案**',
      'stage: draft',
      '---',
      '第三章 风起',
      '',
      '　　门外的影子动了一下。',
      '**他把门推开。**',
    ].join('\n'))

    expect(result.text).toBe([
      '---',
      'title: **旧案**',
      'stage: draft',
      '---',
      '第三章 风起',
      '',
      '门外的影子动了一下。',
      '他把门推开。',
    ].join('\n'))
    expect(result.changed).toBe(true)
    expect(result.rules).toEqual(expect.arrayContaining([
      'indentation_removed',
      'markdown_bold_removed',
    ]))
    expect(result.rules).not.toContain('markdown_block_marker_removed')
  })

  test('includes prose format violations in deterministic cleanup quality gate blockers', () => {
    const cleanup = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, [
      '第三章 风起',
      '他停在门口。',
      '',
      '　　门外的影子动了一下。',
    ].join('\n'))

    expect(cleanup.status).toBe('warn')
    expect(cleanup.categories.map((item: any) => item.type)).toContain('prose_format')
    expect(cleanup.priority_repair).toBe('优先修正文格式')

    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 92,
      issues: [],
      revised: true,
    }, cleanup)
    expect(review.needs_revision).toBe(true)
    expect(review.issues.map((item: any) => item.category)).toContain('format')
    expect(review.issues.map((item: any) => item.issue).join('｜')).toContain('正文格式硬伤')
  })

  test('treats failed write-preparation checks as quality gate blockers', () => {
    const review = {
      passed: true,
      score: 92,
      write_preparation_checks: [
        {
          key: 'asset_linkage',
          label: '旧钥匙挂钩',
          status: 'fail',
          evidence: '正文只写旧钥匙开门，没有交代旧钥匙和母亲旧铺印记的关系。',
          fix: '补出旧钥匙与旧铺印记的证据链。',
        },
      ],
    }

    expect(hasFailingReviewChecks(review)).toBe(true)
    expect(hasReviewChecksNeedingRepair(review)).toBe(true)
  })

  test('wires deterministic prose format risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseFormatChecks = scanProseFormatRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseFormatChecks')
  })

  test('does not mutate prose after the authoritative quality decision', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const decisionStart = source.indexOf('finalText = qualityLoop.final_text')
    const storeStart = source.indexOf("await onStage('store', { status: 'running' })", decisionStart)
    const postDecisionBlock = source.slice(decisionStart, storeStart)

    expect(decisionStart).toBeGreaterThanOrEqual(0)
    expect(storeStart).toBeGreaterThan(decisionStart)
    expect(postDecisionBlock).not.toContain('finalText = normalizeDeterministicProseFormat')
    expect(postDecisionBlock).not.toContain('finalText = normalizeDeterministicProsePunctuation')
    expect(postDecisionBlock).not.toContain('postReviewWordTargetCheck')
  })
  test('carries deterministic prose cleanup misses into the next pre-draft brief and prose prompt', () => {
    const currentChapter = { id: 2, chapter_no: 4, title: '下一章' }
    const chapters = [
      { id: 1, chapter_no: 3, title: '上一章' },
      currentChapter,
    ]
    const reviews = [
      {
        id: 901,
        review_type: 'deterministic_prose_cleanup',
        status: 'warn',
        payload: JSON.stringify({
          chapter_id: 1,
          chapter_no: 3,
          deterministic_prose_cleanup: {
            status: 'warn',
            risk_count: 2,
            priority_repair: '优先清理工程词',
            required_actions: ['把“上一章”改成角色当下能感知的事件锚点。'],
            evidence: ['上一章的伏笔还没有结束。'],
          },
        }),
        created_at: '2026-06-22T08:00:00.000Z',
      },
    ]

    const carryOver = buildDeliveryRiskCarryOverContext(currentChapter, chapters, reviews)

    expect(carryOver?.items.join('｜')).toContain('确定性清理')
    expect(carryOver?.priority_label).toBe('优先清理工程词')
    expect(carryOver?.required_actions.join('｜')).toContain('角色当下能感知')

    const brief = buildChapterPreDraftBrief({ id: 1 }, {
      chapter_no: 4,
      title: '下一章',
      chapter_target: {
        chapter_no: 4,
        title: '下一章',
        delivery_risk_carry_over: carryOver,
      },
      scene_cards: [],
    })
    expect(brief.delivery_risk_carry_over?.items.join('｜')).toContain('确定性清理')
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext({ title: '项目' }, {
      chapter_no: 4,
      title: '下一章',
      chapter_target: brief,
      scene_cards: [],
    } as any)
    expect(prompt).toContain('确定性清理')
    expect(prompt).toContain('角色当下能感知')
  })

  test('prose generation stores deterministic prose cleanup review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain('qualityLoop.final_scan?.cleanup || buildDeterministicProseCleanupReport(chapter, finalText)')
    expect(source).toContain('buildDeterministicProseCleanupReviewRecord({')
    expect(reviewRecordSource).toContain("review_type: 'deterministic_prose_cleanup'")
    expect(postDeliverySource).toContain("['deterministicProseCleanup', 'deterministic_prose_cleanup']")
    expect(source).toContain('deterministicProseCleanup,')
  })

  test('stores deterministic normalization audits with deterministic cleanup review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()
    const storeStart = source.indexOf('buildDeterministicProseCleanupReviewRecord({')
    const storeEnd = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', storeStart)
    const storeBlock = source.slice(storeStart, storeEnd)

    expect(storeBlock).toContain('formatNormalization,')
    expect(storeBlock).toContain('punctuationNormalization,')
    expect(reviewRecordSource).toContain('Number(cleanup.risk_count || 0) <= 0')
    expect(reviewRecordSource).toContain('!input.formatNormalization?.changed')
    expect(reviewRecordSource).toContain('!input.punctuationNormalization?.changed')
    expect(reviewRecordSource).toContain('deterministic_format_normalization: input.formatNormalization')
    expect(reviewRecordSource).toContain('deterministic_punctuation_normalization: input.punctuationNormalization')
  })

  test('turns deterministic prose cleanup residuals into quality gate blockers', () => {
    const cleanup = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, '第三章 风起\n上一章的伏笔还没有结束……他缓缓抬头。')
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 92,
      issues: [],
      revised: true,
    }, cleanup)

    expect(review.needs_revision).toBe(true)
    expect(review.issues.map((item: any) => item.severity)).toContain('critical')
    expect(review.issues.map((item: any) => item.category)).toContain('format')
    expect(review.issues.map((item: any) => item.issue).join('｜')).toContain('确定性清理残留')
    expect(review.issues.map((item: any) => item.fix).join('｜')).toContain('角色当下能感知')

    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 78,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('严重问题')
  })

  test('does not promote nonblocking deterministic cleanup warnings to critical gate failures', () => {
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 92,
      issues: [],
      revised: true,
      next_chapter_quality_plan: {
        quality_focus: ['继续压住规则危机'],
        opening_actions: ['承接清算倒计时'],
        middle_actions: ['兑现资产代价'],
        ending_actions: ['留下镇门钩子'],
        avoid_repetition: ['不要解释设定'],
        evidence_basis: ['上一章门禁'],
      },
    }, {
      risk_count: 2,
      categories: [
        {
          type: 'payoff_density',
          label: '回报密度不足',
          count: 1,
          has_blocking: false,
          evidence: ['中段偏长'],
          required_actions: ['下一章继续补阶段回报'],
        },
        {
          type: 'deslop',
          label: '去AI味硬伤',
          count: 1,
          has_blocking: false,
          evidence: ['冰冷'],
          required_actions: ['替换冰冷'],
        },
      ],
    })

    expect(review.issues.map((item: any) => item.severity)).not.toContain('critical')
    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 78,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(true)
  })

  test('uses a conservative passing score only when score was defaulted and cleanup is clean', () => {
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 80,
      score_defaulted: true,
      issues: [],
      revised: true,
      next_chapter_quality_plan: {
        quality_focus: ['继续压住规则危机'],
        opening_actions: ['承接清算倒计时'],
        middle_actions: ['兑现资产代价'],
        ending_actions: ['留下镇门钩子'],
        avoid_repetition: ['不要解释设定'],
        evidence_basis: ['上一章门禁'],
      },
    }, {
      status: 'ok',
      risk_count: 0,
      categories: [],
    })

    expect(review.score).toBeGreaterThanOrEqual(85)
    expect(review.score_defaulted).toBe(true)
    expect(review.deterministic_score_fallback.reason).toBe('clean_after_deterministic_cleanup')

    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 85,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(true)
  })

  test('keeps a defaulted review below gate when deterministic cleanup still has residuals', () => {
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 80,
      score_defaulted: true,
      issues: [],
      revised: true,
      next_chapter_quality_plan: {
        quality_focus: ['继续压住规则危机'],
        opening_actions: ['承接清算倒计时'],
        middle_actions: ['兑现资产代价'],
        ending_actions: ['留下镇门钩子'],
        avoid_repetition: ['不要解释设定'],
        evidence_basis: ['上一章门禁'],
      },
    }, {
      risk_count: 1,
      categories: [
        {
          type: 'deslop',
          label: '去AI味硬伤',
          count: 1,
          has_blocking: false,
          evidence: ['缓缓'],
          required_actions: ['替换缓缓'],
        },
      ],
    })

    expect(review.score).toBeLessThan(85)
    expect(review.deterministic_score_fallback.reason).toBe('deterministic_cleanup_residuals')

    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 85,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('质检评分')
  })

  test('quality gates evaluate deterministic prose cleanup residuals before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const cleanupStart = source.indexOf('qualityLoop.final_scan?.cleanup || buildDeterministicProseCleanupReport(chapter, finalText)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview = buildQualityGateReviewWithDeterministicCleanup', cleanupStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const finalStart = source.indexOf('const finalQualityDecision =', preStoreStart)
    const gateBlock = source.slice(cleanupStart, finalStart + 260)

    expect(cleanupStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(cleanupStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(finalStart).toBeGreaterThan(preStoreStart)
    expect(gateBlock).toContain('buildQualityGateReviewWithDeterministicCleanup({')
    expect(gateBlock).toContain('...(selfCheck?.review || {})')
    expect(gateBlock).toContain('revised: Boolean(selfCheck.revised)')
    expect(gateBlock).toContain('}, deterministicProseCleanup')
    expect(gateBlock).toContain('getQualityGateDecision(qualityGateProject, qualityGateReview)')
    expect(gateBlock).toContain('getQualityGateDecision(qualityGateProject, qualityGateReview, safetyDecision)')
  })

  test('quality gates include prose revision receipt sync failures before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const syncStart = source.indexOf('let proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(chapter, selfCheck)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', syncStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(syncStart, preStoreStart)

    expect(syncStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(syncStart)
    expect(gateBlock).toContain('revision_receipt_checks')
    expect(gateBlock).toContain('proseRevisionReceiptSync.status ===')
    expect(gateBlock).toContain('proseRevisionReceiptSync.missed_count')
    expect(gateBlock).toContain('修订回执未闭环')
  })

  test('quality gates include deslop repair receipt residual risks before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const deslopCheckStart = source.indexOf('let deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(chapter, selfCheck)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', deslopCheckStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(deslopCheckStart, preStoreStart)

    expect(deslopCheckStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(groupStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(gateBlock).toContain('deslopRepairReceiptRisks')
    expect(gateBlock).toContain('deslopRepairReceiptSync')
    expect(gateBlock).toContain('missingDeslopRepairReceiptChecks')
    expect(gateBlock).toContain('proseQualityDeslopRepairReceiptRisks')
    expect(gateBlock).toContain('deslop_repair_checks: [...missingDeslopRepairReceiptChecks, ...deslopRepairChecks]')
    expect(gateBlock).toContain('去AI味修复回执未闭环')
    expect(gateBlock).toContain('去AI味修复回执未生成')
  })

  test('quality gates include quality audit repair receipt failures before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const qualityCheckStart = source.indexOf('let qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(chapter, selfCheck)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', qualityCheckStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(qualityCheckStart, preStoreStart)

    expect(qualityCheckStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(groupStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(gateBlock).toContain('qualityAuditRepairReceiptSync')
    expect(gateBlock).toContain('missingQualityAuditRepairReceiptChecks')
    expect(gateBlock).toContain('quality_audit_checks: [')
    expect(gateBlock).toContain('...missingQualityAuditRepairReceiptChecks')
    expect(gateBlock).toContain('质量诊断修复回执未生成')
  })

  test('quality gates recompute receipt syncs against final prose text before blocking storage', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const syncChapterStart = source.indexOf('const syncChapterForReceiptEvidence = { ...chapter, chapter_text: finalText }', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', syncChapterStart)
    const syncBlock = source.slice(syncChapterStart, gateReviewStart)

    expect(syncChapterStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(syncChapterStart)
    expect(syncBlock).toContain('proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('revisionCascadeImpactSync = buildRevisionCascadeImpactSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('proseQualityDeslopRepairReceiptRisks({ self_check: selfCheck }, finalText)')
  })

  test('quality gates keep post-delivery receipt sync failures as advisory diagnostics before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const postDeliveryCheckStart = source.indexOf('const postDeliveryReceiptChecks =', groupStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', postDeliveryCheckStart)
    const gateBlock = source.slice(postDeliveryCheckStart, preStoreStart)

    expect(postDeliveryCheckStart).toBeGreaterThan(groupStart)
    expect(preStoreStart).toBeGreaterThan(postDeliveryCheckStart)
    expect(gateBlock).toContain('nextChapterQualityPlanReceiptSync')
    expect(gateBlock).toContain('statusFilterReceiptSync')
    expect(gateBlock).toContain('writePreparationReceiptSync')
    expect(gateBlock).toContain('preStoreSceneCardReceiptSync')
    expect(gateBlock).toContain('preStoreDeliveryRiskReceiptSync')
    expect(gateBlock).toContain("sync_key: 'scene_card_receipts_sync'")
    expect(gateBlock).toContain("sync_key: 'delivery_risk_receipts_sync'")
    expect(gateBlock).toContain('post_delivery_receipt_sync')
    expect(gateBlock).toContain('qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks')
    expect(gateBlock).not.toContain('qualityGateReview.quality_audit_checks =')
  })

  test('draft review quality decision excludes post-delivery receipt sync advisories from the hard gate', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const postDeliveryCheckStart = source.indexOf('const postDeliveryReceiptChecks =', groupStart)
    const postDeliveryAdvisoryStart = source.indexOf('qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks', postDeliveryCheckStart)
    const draftQualityDecisionStart = source.indexOf('const draftQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', groupStart)
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', draftQualityDecisionStart)
    const advisoryBlock = source.slice(postDeliveryCheckStart, draftQualityDecisionStart)

    expect(postDeliveryCheckStart).toBeGreaterThan(groupStart)
    expect(postDeliveryAdvisoryStart).toBeGreaterThan(postDeliveryCheckStart)
    expect(draftQualityDecisionStart).toBeGreaterThan(postDeliveryAdvisoryStart)
    expect(draftReviewOnlyStart).toBeGreaterThan(draftQualityDecisionStart)
    expect(advisoryBlock).toContain("status: 'warn'")
    expect(advisoryBlock).toContain('qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks')
    expect(advisoryBlock).not.toContain('qualityGateReview.quality_audit_checks =')
  })

  test('returns quality audit repair receipt sync in story state update summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain("reviewType: 'quality_audit_repair_receipt_sync'")
    expect(reviewRecordSource).toContain('review_type: input.reviewType')
    expect(source).toContain('buildQualityAuditRepairReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['qualityAuditRepairReceiptSync', 'quality_audit_repair_receipt_sync']")
    expect(source).toContain('qualityAuditRepairReceiptSync,')
  })

  test('returns deterministic prose hygiene sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const draftReviewRecordSource = readDraftSyncReviewRecordSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftProseMetaSync = buildProseMetaSyncReport(project, chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('const draftSourceReadinessSync = buildSourceReadinessSyncReport(project, chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'prose_meta_sync'")
    expect(draftBlock).toContain("payloadKey: 'prose_meta_sync'")
    expect(draftBlock).toContain("reviewType: 'source_readiness_sync'")
    expect(draftBlock).toContain("payloadKey: 'source_readiness_sync'")
    expect(draftReviewRecordSource).toContain('review_type: input.reviewType')
    expect(draftReviewRecordSource).toContain('[input.payloadKey]: sync')
  })

  test('returns chapter title uniqueness sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftChapters = await listNovelChapters(activeWorkspace, projectId)')
    expect(draftBlock).toContain('const draftChapterTitleUniquenessSync = buildChapterTitleUniquenessSyncReport(draftChapters, updatedReviewedDraft || chapter)')
    expect(draftBlock).toContain('buildChapterTitleUniquenessDraftReviewRecord({ projectId, chapter, sync: draftChapterTitleUniquenessSync })')
    expect(draftBlock).toContain('chapterTitleUniquenessSync: draftChapterTitleUniquenessSync')
  })

  test('returns chapter handoff sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftChapterHandoffSync = buildChapterHandoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildChapterHandoffDraftReviewRecord({ projectId, chapter, sync: draftChapterHandoffSync })')
    expect(draftBlock).toContain('chapterHandoffSync: draftChapterHandoffSync')
  })

  test('returns reader expectation sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftReaderExpectationSync = buildReaderExpectationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'reader_expectation_sync'")
    expect(draftBlock).toContain("payloadKey: 'reader_expectation_sync'")
  })

  test('returns reader payoff and retention sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftReaderPayoffSync = buildReaderPayoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText, {})')
    expect(draftBlock).toContain('buildReaderPayoffDraftReviewRecord({ projectId, chapter, sync: draftReaderPayoffSync })')
    expect(draftBlock).toContain('readerPayoffSync: draftReaderPayoffSync')
    expect(draftBlock).toContain('const draftReaderRetentionSync = buildReaderRetentionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'reader_retention_sync'")
    expect(draftBlock).toContain("payloadKey: 'reader_retention_sync'")
  })

  test('returns expectation threshold sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftExpectationThresholdSync = buildExpectationThresholdSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'expectation_threshold_sync'")
    expect(draftBlock).toContain("payloadKey: 'expectation_threshold_sync'")
  })

  test('returns hook sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftChapterHookSync = buildChapterHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'chapter_hook_sync'")
    expect(draftBlock).toContain("payloadKey: 'chapter_hook_sync'")
    expect(draftBlock).toContain('const draftParagraphHookSync = buildParagraphHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'paragraph_hook_sync'")
    expect(draftBlock).toContain("payloadKey: 'paragraph_hook_sync'")
  })

  test('returns prose craft quality sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftOpeningSync = buildOpeningSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'opening_sync'")
    expect(draftBlock).toContain("payloadKey: 'opening_sync'")
    expect(draftBlock).toContain('const draftProseCraftSync = buildProseCraftSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'prose_craft_sync'")
    expect(draftBlock).toContain("payloadKey: 'prose_craft_sync'")
    expect(draftBlock).toContain('const draftQualityAuditSync = buildQualityAuditSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'quality_audit_sync'")
    expect(draftBlock).toContain("payloadKey: 'quality_audit_sync'")
  })

  test('returns payoff and scene rhythm sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftPayoffSetupSync = buildPayoffSetupSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'payoff_setup_sync'")
    expect(draftBlock).toContain("payloadKey: 'payoff_setup_sync'")
    expect(draftBlock).toContain('const draftSpectatorReactionSync = buildSpectatorReactionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'spectator_reaction_sync'")
    expect(draftBlock).toContain("payloadKey: 'spectator_reaction_sync'")
    expect(draftBlock).toContain('const draftBridgeUnitSync = buildBridgeUnitSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'bridge_unit_sync'")
    expect(draftBlock).toContain("payloadKey: 'bridge_unit_sync'")
    expect(draftBlock).toContain('const draftBeatCoolingSync = buildBeatCoolingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'beat_cooling_sync'")
    expect(draftBlock).toContain("payloadKey: 'beat_cooling_sync'")
  })

  test('returns dramatic turn sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftSuspenseSync = buildSuspenseSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'suspense_sync'")
    expect(draftBlock).toContain("payloadKey: 'suspense_sync'")
    expect(draftBlock).toContain('const draftReversalSync = buildReversalSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'reversal_sync'")
    expect(draftBlock).toContain("payloadKey: 'reversal_sync'")
    expect(draftBlock).toContain('const draftShowdownSync = buildShowdownSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'showdown_sync'")
    expect(draftBlock).toContain("payloadKey: 'showdown_sync'")
  })

  test('returns character asset state sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const draftReviewRecordSource = readDraftSyncReviewRecordSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftDialogueSync = buildDialogueSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'dialogue_sync'")
    expect(draftBlock).toContain("payloadKey: 'dialogue_sync'")
    expect(draftBlock).toContain('const draftCharacterBehaviorSync = buildCharacterBehaviorSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'character_behavior_sync'")
    expect(draftBlock).toContain("payloadKey: 'character_behavior_sync'")
    expect(draftBlock).toContain('const draftAssetLinkageSync = buildAssetLinkageSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'asset_linkage_sync'")
    expect(draftBlock).toContain("payloadKey: 'asset_linkage_sync'")
    expect(draftBlock).toContain('const draftStateTrackingSync = buildStateTrackingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'state_tracking_sync'")
    expect(draftBlock).toContain("payloadKey: 'state_tracking_sync'")
    expect(draftReviewRecordSource).toContain('summary: `${sync.label}：${sync.summary}`')
    expect(draftReviewRecordSource).toContain('issues: (sync.missed || [])')
  })

  test('returns receipt syncs in draft review only summaries from the same pre-store receipt context as quality gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftSceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)')
    expect(draftBlock).toContain('buildSceneCardReceiptsDraftReviewRecord({ projectId, chapter, sync: draftSceneCardReceiptSync })')
    expect(draftBlock).toContain('const draftDeliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)')
    expect(draftBlock).toContain('buildDeliveryRiskReceiptsDraftReviewRecord({ projectId, chapter, sync: draftDeliveryRiskReceiptSync })')
  })

  test('returns dialogue and character behavior sync in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return {', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(fullPipelineBlock).toContain('const dialogueSync = buildDialogueSyncReport(project, updated, contextPackage, finalText)')
    expect(fullPipelineBlock).toContain('const characterBehaviorSync = buildCharacterBehaviorSyncReport(project, updated, contextPackage, finalText)')
    expect(postDeliverySource).toContain("['dialogueSync', 'dialogue_sync']")
    expect(postDeliverySource).toContain("['characterBehaviorSync', 'character_behavior_sync']")
  })

  test('returns scene-card receipt sync in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return {', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(fullPipelineBlock).toContain('const sceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)')
    expect(postDeliverySource).toContain("['sceneCardReceiptSync', 'scene_card_receipts_sync']")
  })

  test('returns delivery-risk receipt sync in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return {', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(fullPipelineBlock).toContain('const deliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)')
    expect(postDeliverySource).toContain("['deliveryRiskReceiptSync', 'delivery_risk_receipts_sync']")
  })

  test('returns revision-context receipt sync in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return {', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(source).toContain('let revisionContextReceiptSync = buildRevisionContextReceiptSyncReport(chapter, selfCheck)')
    expect(source).toContain('revisionContextReceiptSync = buildRevisionContextReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['revisionContextReceiptSync', 'revision_context_receipts_sync']")
  })

  test('stores common post-delivery sync reviews through the shared record builder', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()
    const updateStoryStateStart = source.indexOf('const updateStoryStateMachine = async')
    const updateStoryStateEnd = source.indexOf('return {', updateStoryStateStart)
    const updateStoryStateBlock = source.slice(updateStoryStateStart, updateStoryStateEnd > updateStoryStateStart ? updateStoryStateEnd : source.length)

    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffSync, reviewType: 'chapter_handoff_sync'")
    expect(updateStoryStateBlock).toContain('sync: readerExpectationSync')
    expect(updateStoryStateBlock).toContain("reviewType: 'reader_expectation_sync'")
    expect(updateStoryStateBlock).toContain("payloadKey: 'reader_expectation_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: expectationThresholdSync, reviewType: 'expectation_threshold_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHookSync, reviewType: 'chapter_hook_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: paragraphHookSync, reviewType: 'paragraph_hook_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: suspenseSync, reviewType: 'suspense_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: reversalSync, reviewType: 'reversal_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: showdownSync, reviewType: 'showdown_sync'")
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: openingSync, reviewType: 'opening_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: proseCraftSync, reviewType: 'prose_craft_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: punctuationToneSync, reviewType: 'punctuation_tone_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: qualityAuditSync, reviewType: 'quality_audit_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    expect(updateStoryStateBlock).toContain('sync: proseMetaSync')
    expect(updateStoryStateBlock).toContain("reviewType: 'prose_meta_sync'")
    expect(updateStoryStateBlock).toContain("payloadKey: 'prose_meta_sync'")
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: dialogueSync, reviewType: 'dialogue_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterBehaviorSync, reviewType: 'character_behavior_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetLinkageSync, reviewType: 'asset_linkage_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateTrackingSync, reviewType: 'state_tracking_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: sourceReadinessSync, reviewType: 'source_readiness_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: intentConfirmationSync, reviewType: 'intent_confirmation_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: payoffSetupSync, reviewType: 'payoff_setup_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: spectatorReactionSync, reviewType: 'spectator_reaction_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: bridgeUnitSync, reviewType: 'bridge_unit_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: beatCoolingSync, reviewType: 'beat_cooling_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: continuityHeatSync, reviewType: 'continuity_heat_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: conflictStructureSync, reviewType: 'conflict_structure_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: upgradeRhythmSync, reviewType: 'upgrade_rhythm_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: targetReaderSync, reviewType: 'target_reader_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: genrePositioningSync, reviewType: 'genre_positioning_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: femaleAudienceSync, reviewType: 'female_audience_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: plotDynamicsSync, reviewType: 'plot_dynamics_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyPowerSync, reviewType: 'story_power_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterRelationSync, reviewType: 'character_relation_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyDriveSync, reviewType: 'story_drive_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyLoopSync, reviewType: 'story_loop_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: informationFlowSync, reviewType: 'information_flow_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: emotionalArcSync, reviewType: 'emotional_arc_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterArcSync, reviewType: 'character_arc_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBlueprintSync, reviewType: 'chapter_blueprint_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBenchmarkSync, reviewType: 'chapter_benchmark_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: benchmarkRecallSync, reviewType: 'benchmark_recall_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleBoundarySync, reviewType: 'style_boundary_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: innovationSync, reviewType: 'innovation_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: volumeBeatSync, reviewType: 'volume_beat_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterTitleUniquenessSync, reviewType: 'chapter_title_uniqueness_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterStateDeltaSync, reviewType: 'character_state_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: timelineDeltaSync, reviewType: 'timeline_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffDeltaSync, reviewType: 'chapter_handoff_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetStateDeltaSync, reviewType: 'asset_state_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: relationshipDeltaSync, reviewType: 'relationship_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: foreshadowingDeltaSync, reviewType: 'foreshadowing_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateDeltaCompleteness, reviewType: 'state_delta_completeness'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: signatureSceneSync, reviewType: 'signature_scene_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyUnitSync, reviewType: 'story_unit_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreDrift, reviewType: 'chapter_core_drift'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreContractSync, reviewType: 'core_contract_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: readerPayoffSync, reviewType: 'reader_payoff_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: readerRetentionSync, reviewType: 'reader_retention_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterAttractionReview, reviewType: 'chapter_attraction_review'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleSampleSync, reviewType: 'style_sample_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: runwaySync, reviewType: 'runway_sync'"].forEach((token) => expect(updateStoryStateBlock.replace(/\s+/g, ' ')).toContain(token))
    expect(reviewRecordSource).toContain('export function buildPostDeliverySyncReviewRecord')
    expect(reviewRecordSource).toContain('payload: chapterPayload(input.chapter, input.payloadKey, sync)')
  })

  test('returns continuity and conflict sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftIntentConfirmationSync = buildIntentConfirmationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'intent_confirmation_sync'")
    expect(draftBlock).toContain("payloadKey: 'intent_confirmation_sync'")
    expect(draftBlock).toContain('const draftContinuityHeatSync = buildContinuityHeatSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'continuity_heat_sync'")
    expect(draftBlock).toContain("payloadKey: 'continuity_heat_sync'")
    expect(draftBlock).toContain('const draftConflictStructureSync = buildConflictStructureSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'conflict_structure_sync'")
    expect(draftBlock).toContain("payloadKey: 'conflict_structure_sync'")
    expect(draftBlock).toContain('const draftUpgradeRhythmSync = buildUpgradeRhythmSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'upgrade_rhythm_sync'")
    expect(draftBlock).toContain("payloadKey: 'upgrade_rhythm_sync'")
  })

  test('returns market promise sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftTargetReaderSync = buildTargetReaderSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'target_reader_sync'")
    expect(draftBlock).toContain("payloadKey: 'target_reader_sync'")
    expect(draftBlock).toContain('const draftGenrePositioningSync = buildGenrePositioningSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'genre_positioning_sync'")
    expect(draftBlock).toContain("payloadKey: 'genre_positioning_sync'")
    expect(draftBlock).toContain('const draftFemaleAudienceSync = buildFemaleAudienceSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'female_audience_sync'")
    expect(draftBlock).toContain("payloadKey: 'female_audience_sync'")
    expect(draftBlock).toContain('const draftPlotDynamicsSync = buildPlotDynamicsSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'plot_dynamics_sync'")
    expect(draftBlock).toContain("payloadKey: 'plot_dynamics_sync'")
    expect(draftBlock).toContain('const draftCharacterRelationSync = buildCharacterRelationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'character_relation_sync'")
    expect(draftBlock).toContain("payloadKey: 'character_relation_sync'")
  })

  test('returns story structure sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftStoryDriveSync = buildStoryDriveSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'story_drive_sync'")
    expect(draftBlock).toContain("payloadKey: 'story_drive_sync'")
    expect(draftBlock).toContain('const draftStoryLoopSync = buildStoryLoopSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'story_loop_sync'")
    expect(draftBlock).toContain("payloadKey: 'story_loop_sync'")
    expect(draftBlock).toContain('const draftInformationFlowSync = buildInformationFlowSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'information_flow_sync'")
    expect(draftBlock).toContain("payloadKey: 'information_flow_sync'")
    expect(draftBlock).toContain('const draftEmotionalArcSync = buildEmotionalArcSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'emotional_arc_sync'")
    expect(draftBlock).toContain("payloadKey: 'emotional_arc_sync'")
    expect(draftBlock).toContain('const draftCharacterArcSync = buildCharacterArcSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'character_arc_sync'")
    expect(draftBlock).toContain("payloadKey: 'character_arc_sync'")
  })

  test('returns blueprint benchmark style sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftChapterBlueprintSync = buildChapterBlueprintSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'chapter_blueprint_sync'")
    expect(draftBlock).toContain("payloadKey: 'chapter_blueprint_sync'")
    expect(draftBlock).toContain('const draftChapterBenchmarkSync = buildChapterBenchmarkSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'chapter_benchmark_sync'")
    expect(draftBlock).toContain("payloadKey: 'chapter_benchmark_sync'")
    expect(draftBlock).toContain('const draftBenchmarkRecallSync = buildBenchmarkRecallSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'benchmark_recall_sync'")
    expect(draftBlock).toContain("payloadKey: 'benchmark_recall_sync'")
    expect(draftBlock).toContain('const draftStyleBoundarySync = buildStyleBoundarySyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'style_boundary_sync'")
    expect(draftBlock).toContain("payloadKey: 'style_boundary_sync'")
    expect(draftBlock).toContain('const draftStyleSampleSync = buildStyleSampleSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildStyleSampleDraftReviewRecord({ projectId, chapter, sync: draftStyleSampleSync })')
    expect(draftBlock).toContain('styleSampleSync: draftStyleSampleSync')
    expect(draftBlock).toContain('const draftInnovationSync = buildInnovationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'innovation_sync'")
    expect(draftBlock).toContain("payloadKey: 'innovation_sync'")
    expect(draftBlock).toContain('const draftVolumeBeatSync = buildVolumeBeatSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'volume_beat_sync'")
    expect(draftBlock).toContain("payloadKey: 'volume_beat_sync'")
    expect(draftBlock).toContain('const draftRunwaySync = buildRunwaySyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'runway_sync'")
    expect(draftBlock).toContain("payloadKey: 'runway_sync'")
  })

  test('returns remaining deterministic story sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftChapterAttractionReview = buildChapterAttractionReviewReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildChapterAttractionDraftReviewRecord({ projectId, chapter, sync: draftChapterAttractionReview })')
    expect(draftBlock).toContain('chapterAttractionReview: draftChapterAttractionReview')
    expect(draftBlock).toContain('const draftPunctuationToneSync = buildPunctuationToneSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'punctuation_tone_sync'")
    expect(draftBlock).toContain("payloadKey: 'punctuation_tone_sync'")
    expect(draftBlock).toContain('const draftSignatureSceneSync = buildSignatureSceneSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildSignatureSceneDraftReviewRecord({ projectId, chapter, sync: draftSignatureSceneSync })')
    expect(draftBlock).toContain('signatureSceneSync: draftSignatureSceneSync')
    expect(draftBlock).toContain('const draftStoryUnitSync = buildStoryUnitSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildStoryUnitDraftReviewRecord({ projectId, chapter, sync: draftStoryUnitSync })')
    expect(draftBlock).toContain('storyUnitSync: draftStoryUnitSync')
  })

  test('returns core drift and contract sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftCoreDrift = buildChapterCoreDriftReport(project, updatedReviewedDraft || chapter, contextPackage, finalText, { missed: [], forbidden_touched: [] })')
    expect(draftBlock).toContain('buildChapterCoreDriftDraftReviewRecord({ projectId, chapter, sync: draftCoreDrift })')
    expect(draftBlock).toContain('coreDrift: draftCoreDrift')
    expect(draftBlock).toContain('const draftCoreContractSync = buildCoreContractSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildCoreContractDraftReviewRecord({ projectId, chapter, sync: draftCoreContractSync })')
    expect(draftBlock).toContain('coreContractSync: draftCoreContractSync')
  })

  test('queues prose sync diagnostics until minimal validation and atomic acceptance complete', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const storeFnsStart = source.indexOf('const storeGeneratedReviewRecord = async (record: any) =>', groupStart)
    const preGateStart = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', storeFnsStart)
    const storeFnsBlock = source.slice(storeFnsStart, source.indexOf('let chapters = await listNovelChapters', storeFnsStart))
    const preGateBlock = source.slice(preGateStart, source.indexOf('const referenceReport =', preGateStart))
    const hardAdmissionStart = source.indexOf('const hardAdmission = classifyProseAdmission({', preGateStart)
    const atomicCommitStart = source.indexOf('acceptance = await commitNovelChapterAcceptance(activeWorkspace, {', preGateStart)
    const atomicCommitBlock = source.slice(atomicCommitStart, source.indexOf('const updated = acceptance.chapter', atomicCommitStart))

    expect(storeFnsStart).toBeGreaterThan(groupStart)
    expect(preGateStart).toBeGreaterThan(storeFnsStart)
    expect(storeFnsBlock).toContain('pendingGeneratedReviews.push(record)')
    expect(preGateBlock).not.toContain('createNovelReview')
    expect(hardAdmissionStart).toBeGreaterThan(preGateStart)
    expect(atomicCommitStart).toBeGreaterThan(hardAdmissionStart)
    expect(atomicCommitBlock).toContain('...pendingGeneratedReviews')
  })

  test('records pre-store quality failures as warnings instead of approval errors', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const preGateStart = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', groupStart)
    const warningStart = source.indexOf('qualityWarningCandidates.push(', preGateStart)
    const hardAdmissionStart = source.indexOf('const hardAdmission = classifyProseAdmission({', preGateStart)
    const preGateBlock = source.slice(preGateStart, hardAdmissionStart)

    expect(preGateStart).toBeGreaterThan(groupStart)
    expect(warningStart).toBeGreaterThan(preGateStart)
    expect(hardAdmissionStart).toBeGreaterThan(warningStart)
    expect(preGateBlock).toContain("proseAdmissionWarning('quality', failure?.key || 'quality_gate'")
    expect(preGateBlock).not.toContain("buildApprovalError('quality_gate'")
  })

  test('keeps explicit safety blocks hard while recording final quality failures as warnings', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const finalGateStart = source.indexOf('const finalQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview, safetyDecision)', groupStart)
    const safetyBlockStart = source.indexOf('if (safetyDecision.blocked)', finalGateStart)
    const warningStart = source.indexOf('qualityWarningCandidates.push(', safetyBlockStart)
    const storyStateStart = source.indexOf("await onStage('story_state', { status: 'running', phase: 'prepare' })", warningStart)
    const finalGateBlock = source.slice(finalGateStart, storyStateStart)

    expect(finalGateStart).toBeGreaterThan(groupStart)
    expect(safetyBlockStart).toBeGreaterThan(finalGateStart)
    expect(warningStart).toBeGreaterThan(safetyBlockStart)
    expect(finalGateBlock).toContain("code: 'REFERENCE_SAFETY_BLOCKED'")
    expect(finalGateBlock).toContain("proseAdmissionWarning('quality', failure?.key || 'final_quality_gate'")
    expect(finalGateBlock).not.toContain("buildApprovalError('quality_gate'")
  })

  test('converts low-score and draft approval policies into review warnings', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const lowScoreStart = source.indexOf("if (approvalRequired(approvalPolicy, 'low_score'", groupStart)
    const draftStart = source.indexOf("if (approvalRequired(approvalPolicy, 'draft'", lowScoreStart)
    const hardAdmissionStart = source.indexOf('const hardAdmission = classifyProseAdmission({', draftStart)
    const warningBlock = source.slice(lowScoreStart, hardAdmissionStart)

    expect(lowScoreStart).toBeGreaterThan(groupStart)
    expect(draftStart).toBeGreaterThan(lowScoreStart)
    expect(hardAdmissionStart).toBeGreaterThan(draftStart)
    expect(warningBlock).toContain("proseAdmissionWarning('quality', 'low_score_approval'")
    expect(warningBlock).toContain("proseAdmissionWarning('review', 'draft_approval'")
    expect(warningBlock).not.toContain("buildApprovalError('low_score'")
    expect(warningBlock).not.toContain("buildApprovalError('draft'")
  })

  test('keeps explicit reference safety blocks hard and records review-only safety concerns as warnings', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const safetyBlockedStart = source.indexOf('if (safetyDecision.blocked)', groupStart)
    const safetyBlockedThrowStart = source.indexOf("const error = Object.assign(new Error('仿写安全阈值未通过')", safetyBlockedStart)
    const safetyBlockedBlock = source.slice(safetyBlockedStart, safetyBlockedThrowStart)
    const safetyApprovalStart = source.indexOf("const safetyApprovalRequired = approvalRequired(approvalPolicy, 'safety'", safetyBlockedThrowStart)
    const storyStateStart = source.indexOf("await onStage('story_state', { status: 'running', phase: 'prepare' })", safetyApprovalStart)
    const safetyApprovalBlock = source.slice(safetyApprovalStart, storyStateStart)

    expect(safetyBlockedStart).toBeGreaterThan(groupStart)
    expect(safetyBlockedThrowStart).toBeGreaterThan(safetyBlockedStart)
    expect(safetyBlockedBlock).not.toContain('createNovelReview')

    expect(safetyApprovalStart).toBeGreaterThan(safetyBlockedThrowStart)
    expect(storyStateStart).toBeGreaterThan(safetyApprovalStart)
    expect(safetyApprovalBlock).toContain("proseAdmissionWarning('review', 'safety_review'")
    expect(safetyApprovalBlock).not.toContain("buildApprovalError('safety'")
  })

  test('passes deterministic cleanup report into cleanup repair prompts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(revisionPrompt).toContain('deterministic_prose_cleanup')
    expect(revisionPrompt).toContain('【确定性清理报告 deterministic_prose_cleanup】')
    expect(revisionPrompt).toContain('deterministic_prose_cleanup.payoff_density')
    expect(revisionPrompt).toContain('短周期读者回报')
    expect(reviewNormalizeBlock).toContain('deterministic_prose_cleanup')
    expect(reviewNormalizeBlock).toContain('options.deterministic_prose_cleanup')
  })

  test('asks prose self review and revision to enforce oh-story dialogue checks', () => {
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

    expect(reviewPrompt).toContain('chapter_target.dialogue_contract')
    expect(reviewPrompt).toContain('dialogue_checks')
    expect(reviewPrompt).toContain('潜台词')
    expect(reviewPrompt).toContain('对话长度 = 权力地位')
    expect(reviewPrompt).toContain('压制模式')
    expect(reviewPrompt).toContain('掌控者/主角亮底牌时对白 ≤ 10 字')
    expect(reviewPrompt).toContain('真实动机绝对不能浅显地写在台词里')
    expect(reviewPrompt).toContain('关系 × 场合 × 目的 = 语气')
    expect(reviewPrompt).toContain('命令式+否定式最能激发读者情绪')
    expect(reviewPrompt).toContain('每次转变需对应事件触发')
    expect(reviewPrompt).toContain('对话本身带来/强化某个核心驱动力')
    expect(reviewPrompt).toContain('用角色的语气和立场包裹信息')
    expect(reviewPrompt).toContain('设定用到哪个稍微带出来')
    expect(reviewPrompt).toContain('口癖和惯用语')
    expect(reviewPrompt).toContain('说话节奏')
    expect(reviewPrompt).toContain('信息偏好')
    expect(reviewPrompt).toContain('身份影响措辞')
    expect(reviewPrompt).toContain('关系阶段不同')
    expect(reviewPrompt).toContain('弹幕/群众对话')
    expect(reviewPrompt).toContain('普通人震惊')
    expect(reviewPrompt).toContain('专业人士分析')
    expect(reviewPrompt).toContain('不代替主线')
    expect(reviewPrompt).toContain('对话节奏/呼吸感')
    expect(reviewPrompt).toContain('连续多轮对话后需要换气')
    expect(reviewPrompt).toContain('关键信息放对话开头或结尾')
    expect(reviewPrompt).toContain('对话篇幅控制')
    expect(reviewPrompt).toContain('读者已知信息')
    expect(reviewPrompt).toContain('突发状况替代')
    expect(reviewPrompt).toContain('主角旁白平铺直叙')
    expect(reviewPrompt).toContain('梗式对白')
    expect(reviewPrompt).toContain('说不出来但意思到了')
    expect(reviewPrompt).toContain('不得直接复刻')
    expect(reviewPrompt).toContain('对话质量审计')
    expect(reviewPrompt).toContain('大量信息都必须用对话来展示')
    expect(reviewPrompt).toContain('问答式的一问一答')
    expect(reviewPrompt).toContain('依赖对话来推动剧情或人物变化')
    expect(reviewPrompt).toContain('遮住角色名后能否区分')
    expect(reviewPrompt).toContain('单次对话不超过全节 40%')
    expect(reviewPrompt).toContain('自然口语交流')
    expect(reviewPrompt).toContain('对话结尾能否预示接下来的节奏变化')
    expect(revisionPrompt).toContain('dialogue_checks')
    expect(revisionPrompt).toContain('对白')
    expect(revisionPrompt).toContain('压制/反转/心死模式')
    expect(revisionPrompt).toContain('短句方成为权力上位')
    expect(revisionPrompt).toContain('把真实目的改成借口、试探、回避或动作反应')
    expect(revisionPrompt).toContain('按关系、场合、目的重定语气')
    expect(revisionPrompt).toContain('用命令式、否定式或为你好式压迫制造情绪')
    expect(revisionPrompt).toContain('按事件→情绪反应→内心思考→采取行动修复跳步')
    expect(revisionPrompt).toContain('把说明书式设定改成角色语气、立场、追问、误导或动作承接')
    expect(revisionPrompt).toContain('用下行质疑、上行证据和核心信息兑现形成信息拉扯')
    expect(revisionPrompt).toContain('按口癖、节奏、信息偏好、身份措辞和关系阶段重写角色声线')
    expect(revisionPrompt).toContain('按普通人震惊、专业人士分析、特殊身份者反应重排群众/弹幕递进')
    expect(revisionPrompt).toContain('每条群众反应短小精悍')
    expect(revisionPrompt).toContain('连续多轮对话后插入换气')
    expect(revisionPrompt).toContain('紧张段落改短促')
    expect(revisionPrompt).toContain('关键信息放到对话开头或结尾')
    expect(revisionPrompt).toContain('读者已知信息改成叙事一句话概括')
    expect(revisionPrompt).toContain('能用突发状况替代的对话直接替换')
    expect(revisionPrompt).toContain('用配角对话替代主角旁白平铺直叙')
    expect(revisionPrompt).toContain('把梗式对白改成角色说不出来但意思到了的口吻')
    expect(revisionPrompt).toContain('不得直接复刻热梗原句')
    expect(revisionPrompt).toContain('把大量信息必须靠对白展示的段落拆成情节、心理、旁白、环境或动作')
    expect(revisionPrompt).toContain('把问答式的一问一答改成主动发言、反应、动作、沉默和心理承接')
    expect(revisionPrompt).toContain('遮住角色名仍能区分是谁在说话')
    expect(revisionPrompt).toContain('单次对话不超过全节 40%')
    expect(revisionPrompt).toContain('逐句改成自然口语交流')
    expect(revisionPrompt).toContain('让对话结尾预示接下来的节奏变化')
    expect(shouldReviseBlock).toContain('dialogue_checks')
    expect(reviewNormalizeBlock).toContain('dialogue_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.dialogue_checks')
  })

  test('asks prose self review and revision to enforce oh-story plot dynamics checks', () => {
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

    expect(reviewPrompt).toContain('chapter_target.plot_dynamics_contract')
    expect(reviewPrompt).toContain('plot_dynamics_checks')
    expect(reviewPrompt).toContain('目标→阻碍→行动')
    expect(reviewPrompt).toContain('蓄能→假胜→崩解')
    expect(reviewPrompt).toContain('主线和支线错开')
    expect(revisionPrompt).toContain('plot_dynamics_checks')
    expect(revisionPrompt).toContain('剧情动力')
    expect(revisionPrompt).toContain('多线错峰')
    expect(shouldReviseBlock).toContain('plot_dynamics_checks')
    expect(reviewNormalizeBlock).toContain('plot_dynamics_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.plot_dynamics_checks')
  })

  test('asks prose self review and revision to enforce oh-story story power checks', () => {
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

    expect(reviewPrompt).toContain('chapter_target.story_power_contract')
    expect(reviewPrompt).toContain('story_power_checks')
    expect(reviewPrompt).toContain('故事五维')
    expect(reviewPrompt).toContain('有动作才是故事')
    expect(reviewPrompt).toContain('因果反馈')
    expect(revisionPrompt).toContain('story_power_checks')
    expect(revisionPrompt).toContain('故事力')
    expect(revisionPrompt).toContain('行动改变局势')
    expect(shouldReviseBlock).toContain('story_power_checks')
    expect(reviewNormalizeBlock).toContain('story_power_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.story_power_checks')
  })

  test('builds a deterministic story power sync report', () => {
    const contextPackage = {
      chapter_target: {
        story_power_contract: {
          story_power_dimensions: ['故事五维：目标、阻碍、动作、反馈、期待'],
          action_rules: ['有动作才是故事：主角必须用动作改变局势。'],
          beginning_end_rules: ['有始有终：开场目标必须在章末形成状态变化。'],
          causal_feedback_rules: ['因果反馈：动作必须带来代价、信息或关系变化。'],
          quality_checks: ['行动是否改变局势。'],
        },
      },
    }

    const report = buildStoryPowerSyncReport(
      { title: '寒门阵师' },
      { id: 9, chapter_no: 11, title: '阵盘入局' },
      contextPackage,
      '主角当众押上裂纹阵盘。执事封锁证物，他没有退，反手启动残阵。阵纹反向亮起，证人脸色发白，内门库房第一次被指向。这个动作让旧案从无头案变成可追查的线索。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toContain('故事力')
    expect(report.quality_checks.join('｜')).toContain('行动是否改变局势')
    expect(report.delivered.map((item: any) => item.key).join('｜')).toContain('action_rules')
    expect(report.delivered.map((item: any) => item.key).join('｜')).toContain('causal_feedback_rules')
  })

  test('asks prose self review and revision to enforce oh-story continuity heat checks', () => {
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

    expect(reviewPrompt).toContain('chapter_target.continuity_heat_contract')
    expect(reviewPrompt).toContain('continuity_heat_checks')
    expect(reviewPrompt).toContain('hot/warm/cold/archived')
    expect(revisionPrompt).toContain('continuity_heat_checks')
    expect(revisionPrompt).toContain('连续性热度')
    expect(shouldReviseBlock).toContain('continuity_heat_checks')
    expect(reviewNormalizeBlock).toContain('continuity_heat_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.continuity_heat_checks')
  })

  test('asks prose self review and revision to enforce oh-story character relation checks', () => {
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

    expect(reviewPrompt).toContain('chapter_target.character_relation_contract')
    expect(reviewPrompt).toContain('character_relation_checks')
    expect(reviewPrompt).toContain('关系类型明确')
    expect(reviewPrompt).toContain('配角期待枢纽')
    expect(reviewPrompt).toContain('任务基地')
    expect(reviewPrompt).toContain('短期和长期期待')
    expect(revisionPrompt).toContain('character_relation_checks')
    expect(revisionPrompt).toContain('角色关系')
    expect(revisionPrompt).toContain('配角期待枢纽')
    expect(revisionPrompt).toContain('人物扣')
    expect(shouldReviseBlock).toContain('character_relation_checks')
    expect(reviewNormalizeBlock).toContain('character_relation_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.character_relation_checks')
  })

  test('asks prose self review and revision to enforce oh-story information flow checks', () => {
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

    expect(reviewPrompt).toContain('chapter_target.information_flow_contract')
    expect(reviewPrompt).toContain('information_flow_checks')
    expect(reviewPrompt).toContain('信息团')
    expect(revisionPrompt).toContain('information_flow_checks')
    expect(revisionPrompt).toContain('信息团衔接')
    expect(shouldReviseBlock).toContain('information_flow_checks')
    expect(reviewNormalizeBlock).toContain('information_flow_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.information_flow_checks')
  })

  test('asks prose self review and revision to enforce oh-story expectation threshold checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityExpectationThresholdRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.expectation_threshold_contract')
    expect(reviewPrompt).toContain('expectation_threshold_checks')
    expect(reviewPrompt).toContain('两长一短')
    expect(reviewPrompt).toContain('设门槛')
    expect(reviewPrompt).toContain('期待感 > 爽点')
    expect(reviewPrompt).toContain('期待接力法')
    expect(revisionPrompt).toContain('expectation_threshold_checks')
    expect(revisionPrompt).toContain('期待门槛')
    expect(revisionPrompt).toContain('期待铺垫')
    expect(revisionPrompt).toContain('闭环一个期待')
    expect(shouldReviseBlock).toContain('expectation_threshold_checks')
    expect(reviewNormalizeBlock).toContain('expectation_threshold_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.expectation_threshold_checks')
    expect(riskCarryOverBlock).toContain('expectation_threshold_checks')
    expect(riskCarryOverBlock).toContain('期待门槛')
  })

  test('asks prose self review and revision to enforce oh-story target reader checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityTargetReaderRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.target_reader_contract')
    expect(reviewPrompt).toContain('target_reader_checks')
    expect(reviewPrompt).toContain('target_reader_profile')
    expect(reviewPrompt).toContain('reader_desire')
    expect(reviewPrompt).toContain('emotion_gap')
    expect(reviewPrompt).toContain('chapter_hit')
    expect(reviewPrompt).toContain('platform_taste')
    expect(reviewPrompt).toContain('自嗨判定')
    expect(reviewPrompt).toContain('我这书写给谁看')
    expect(reviewPrompt).toContain('情绪缺口')
    expect(reviewPrompt).toContain('核心痛苦')
    expect(reviewPrompt).toContain('深层情结')
    expect(reviewPrompt).toContain('高频情绪关键词')
    expect(reviewPrompt).toContain('题材生命力')
    expect(reviewPrompt).toContain('目标平台样本')
    expect(reviewPrompt).toContain('题材边界')
    expect(reviewPrompt).toContain('书名简介内容三位一体')
    expect(reviewPrompt).toContain('代入感/塑料感')
    expect(reviewPrompt).toContain('金手指生活关联')
    expect(reviewPrompt).toContain('私人表达')
    expect(revisionPrompt).toContain('target_reader_checks')
    expect(revisionPrompt).toContain('目标读者')
    expect(revisionPrompt).toContain('情绪缺口')
    expect(revisionPrompt).toContain('核心痛苦')
    expect(revisionPrompt).toContain('未满足需求')
    expect(revisionPrompt).toContain('目标平台样本')
    expect(revisionPrompt).toContain('书名简介内容')
    expect(revisionPrompt).toContain('世界观自洽')
    expect(revisionPrompt).toContain('私人表达')
    expect(shouldReviseBlock).toContain('target_reader_checks')
    expect(reviewNormalizeBlock).toContain('target_reader_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.target_reader_checks')
    expect(riskCarryOverBlock).toContain('target_reader_checks')
    expect(riskCarryOverBlock).toContain('目标读者')
  })

  test('asks prose self review and revision to enforce oh-story genre positioning checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityGenrePositioningRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.genre_positioning_contract')
    expect(reviewPrompt).toContain('genre_positioning_checks')
    expect(reviewPrompt).toContain('genre_tag')
    expect(reviewPrompt).toContain('core_hook')
    expect(reviewPrompt).toContain('type_formula')
    expect(reviewPrompt).toContain('genre_strength')
    expect(reviewPrompt).toContain('book_title_blurb_alignment')
    expect(reviewPrompt).toContain('核心梗')
    expect(reviewPrompt).toContain('挂羊头卖狗肉')
    expect(reviewPrompt).toContain('拉长板而非补短板')
    expect(reviewPrompt).toContain('题材长板')
    expect(reviewPrompt).toContain('70/20/10元素法则')
    expect(reviewPrompt).toContain('五种微创新手法')
    expect(revisionPrompt).toContain('genre_positioning_checks')
    expect(revisionPrompt).toContain('题材定位')
    expect(revisionPrompt).toContain('长板')
    expect(revisionPrompt).toContain('稀释核心卖点')
    expect(revisionPrompt).toContain('70/20/10')
    expect(shouldReviseBlock).toContain('genre_positioning_checks')
    expect(reviewNormalizeBlock).toContain('genre_positioning_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.genre_positioning_checks')
    expect(riskCarryOverBlock).toContain('genre_positioning_checks')
    expect(riskCarryOverBlock).toContain('题材定位')
  })

  test('asks prose self review and revision to enforce oh-story plot special topic checks', () => {
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
    const structuredFieldsSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/structured-review-fields.ts'), 'utf8')
    const structuredFieldsBlock = structuredFieldsSource.slice(
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_CHECK_FIELDS'),
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_REQUIRED_FIELDS'),
    )
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityPlotSpecialTopicsRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.plot_special_topics_contract')
    expect(reviewPrompt).toContain('plot_special_topics_checks')
    expect(reviewPrompt).toContain('matched_topics')
    expect(reviewPrompt).toContain('goldfinger_execution')
    expect(reviewPrompt).toContain('genre_boundary_execution')
    expect(reviewPrompt).toContain('launch_checkpoint_execution')
    expect(reviewPrompt).toContain('faction_hand_execution')
    expect(reviewPrompt).toContain('题材边界')
    expect(reviewPrompt).toContain('三万字卡点')
    expect(revisionPrompt).toContain('plot_special_topics_checks')
    expect(revisionPrompt).toContain('特殊题材')
    expect(shouldReviseBlock).toContain('plot_special_topics_checks')
    expect(reviewNormalizeBlock).toContain('plot_special_topics_checks')
    expect(source).toContain('reviewPayload?.plot_special_topics_checks')
    expect(structuredFieldsBlock).toContain('plot_special_topics_checks')
    expect(riskCarryOverBlock).toContain('plot_special_topics_checks')
    expect(riskCarryOverBlock).toContain('特殊题材')
  })

  test('asks prose self review and revision to enforce oh-story female audience checks', () => {
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

    expect(reviewPrompt).toContain('chapter_target.female_audience_contract')
    expect(reviewPrompt).toContain('female_audience_checks')
    expect(reviewPrompt).toContain('安全感优先')
    expect(reviewPrompt).toContain('代入感优先')
    expect(reviewPrompt).toContain('女主主动性')
    expect(reviewPrompt).toContain('情绪即产品')
    expect(reviewPrompt).toContain('货板一致')
    expect(revisionPrompt).toContain('female_audience_checks')
    expect(revisionPrompt).toContain('女频长篇')
    expect(revisionPrompt).toContain('补安全感锚点')
    expect(revisionPrompt).toContain('把女主被动改成女主自己做决定')
    expect(revisionPrompt).toContain('感情升级踩到事业/成长节点')
    expect(revisionPrompt).toContain('虐后补反转或糖')
    expect(shouldReviseBlock).toContain('female_audience_checks')
    expect(reviewNormalizeBlock).toContain('female_audience_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.female_audience_checks')
  })

  test('names required rich contract fields in prose self review prompt', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const requiredFieldsByCheck = {
      content_rubric_checks: ['core_selling_point', 'conflict_progression', 'chapter_change', 'page_turn_reason'],
      quality_audit_checks: ['strategy', 'purpose_tag', 'density_change', 'conflict_bound_info', 'changed_evidence'],
      core_contract_checks: ['core_promise', 'mainline_service', 'core_emotion', 'rule_judgement', 'ending_question'],
      innovation_checks: ['innovation_type', 'differentiating_mechanism', 'visualized_scene', 'reader_retellable_hook', 'long_term_fit'],
      chapter_attraction_checks: ['attraction_dimension', 'opening_hook', 'scene_goal_obstacle_turn_reward', 'payoff_density', 'ending_page_turn', 'spreadable_scene'],
      story_drive_checks: ['protagonist_choice', 'obstacle', 'cost', 'state_change', 'next_causality'],
      character_arc_checks: ['character', 'desire', 'flaw_pressure', 'relationship_change', 'growth_beat', 'voice_anchor'],
      chapter_benchmark_checks: ['benchmark_dimension', 'expected_method', 'delivered_evidence', 'originality_guard'],
      title_uniqueness_checks: ['old_title', 'new_title', 'outline_title_synced', 'file_name_synced', 'chapter_title_line_synced'],
      prose_meta_checks: ['matched_term', 'location', 'replacement'],
      banned_words_checks: ['matched_word', 'level', 'location', 'replacement'],
      blueprint_consumption_checks: ['blueprint_field', 'expected', 'delivered_evidence', 'missing_gap'],
      word_count_checks: ['current_count', 'target_count', 'min_required_count'],
      female_audience_checks: ['security_anchor', 'reader_identification', 'heroine_agency', 'relationship_axis', 'post_abuse_payoff'],
      upgrade_rhythm_checks: ['before_after_contrast', 'instant_feedback', 'delayed_feedback', 'new_threshold', 'cheat_rule'],
      structure_checks: ['opening_hook', 'middle_progression', 'situation_change', 'ending_page_turn'],
      progression_checks: ['non_deletable_change', 'mainline_shift', 'relationship_or_state_change', 'compressed_water'],
      information_checks: ['new_concept_count', 'action_bound_info', 'conflict_release', 'reader_first_scene'],
      style_boundary_checks: ['reference_risk', 'rewritten_with_local_action', 'voice_anchor', 'copied_phrase_removed'],
      information_flow_checks: ['reveal_order', 'withheld_question', 'action_bound_release', 'conflict_or_cost'],
      expectation_threshold_checks: ['reader_question', 'stakes', 'choice_pressure', 'payoff_promise', 'next_chapter_pull'],
      story_loop_checks: ['setup_question', 'obstacle', 'choice', 'cost', 'payoff_or_answer_fragment', 'new_question'],
      emotional_arc_checks: ['calm_or_pressure', 'mobilization', 'counteraction', 'release', 'reader_payoff'],
      chapter_hook_checks: ['hook_position', 'trigger', 'reader_question', 'next_chapter_pressure', 'delivered_evidence'],
      chapter_hook_quality_checks: ['hook_position', 'trigger_type', 'concrete_question', 'danger_or_choice', 'next_action_link'],
      paragraph_hook_checks: ['paragraph_range', 'hook_type', 'micro_change', 'information_or_risk_delta', 'emotion_or_relation_delta'],
      suspense_checks: ['question', 'misdirect', 'partial_answer', 'new_expectation'],
      asset_linkage_checks: ['asset_name', 'function', 'ownership', 'trigger_condition', 'limitation', 'consequence', 'story_link'],
      dialogue_checks: ['speaker', 'agenda', 'subtext', 'power_shift', 'information_delta', 'character_voice'],
      plot_dynamics_checks: ['goal', 'obstacle', 'action', 'cost_or_feedback', 'new_expectation'],
      continuity_heat_checks: ['heat_state', 'hot_progress', 'warm_keepalive', 'cold_warmup', 'archived_boundary'],
      character_relation_checks: ['relation_type', 'protagonist_goal', 'agency_choice', 'cost', 'relation_shift'],
      character_behavior_checks: ['character', 'concrete_motive', 'emotional_reason', 'trigger_change', 'visible_choice', 'cost'],
      conflict_structure_checks: ['blocker', 'no_exit_condition', 'stakes_or_exit_cost', 'action_block', 'win_loss_result'],
      state_tracking_checks: ['state_subject', 'state_type', 'previous_state', 'allowed_state', 'used_in_chapter', 'excluded_reason'],
      opening_checks: ['protagonist_entry', 'first_300_goal', 'first_1000_expectation', 'opening_principle'],
      bridge_unit_checks: ['bridge_position', 'old_expectation_payoff', 'new_expectation_seed', 'goal_progression', 'climax_hook', 'stage_handoff'],
      reversal_checks: ['reversal_type', 'fair_clues', 'misdirect', 'reveal_timing', 'impact_after_reveal'],
      showdown_checks: ['payoff_release', 'trump_card_used', 'pressure_layers', 'audience_reactions', 'consequence', 'next_threshold'],
      prose_craft_checks: ['pov_depth', 'body_detail', 'environment_interaction', 'action_stillness_balance', 'crowd_reaction_layering'],
      serial_risk_repair_checks: ['risk_type', 'repair_receipt', 'continuity_change', 'state_change'],
      revision_receipt_checks: ['required_action', 'repair_segment', 'applied_fix', 'changed_evidence'],
      deslop_repair_checks: ['gate', 'original_risk', 'rewritten_evidence', 'changed_evidence', 'receipt_synced'],
      status_filter_receipts: ['used_in_chapter', 'excluded_reason'],
      next_chapter_quality_plan_receipts: ['delivered', 'evidence', 'remaining_risk'],
      longform_checks: ['recent_5_chapter_progress', 'payoff_interval', 'stage_goal_shift', 'next_stage_pull', 'context_layer'],
      punctuation_tone_checks: ['speaker', 'punctuation_issue', 'tone_intent', 'replacement', 'voice_difference'],
    }

    for (const [checkField, requiredFields] of Object.entries(requiredFieldsByCheck)) {
      expect(reviewPrompt).toContain(checkField)
      for (const field of requiredFields) {
        expect(reviewPrompt).toContain(field)
      }
    }
  })

  test('asks prose self review and revision to enforce oh-story showdown checks', () => {
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

    expect(reviewPrompt).toContain('chapter_target.showdown_contract')
    expect(reviewPrompt).toContain('showdown_checks')
    expect(reviewPrompt).toContain('爽点释放')
    expect(reviewPrompt).toContain('群众层 -> 中间层 -> 核心层')
    expect(reviewPrompt).toContain('打斗是一场表演')
    expect(reviewPrompt).toContain('三层破局')
    expect(reviewPrompt).toContain('预判反制')
    expect(reviewPrompt).toContain('反预判')
    expect(reviewPrompt).toContain('无敌文主角不拖拉')
    expect(reviewPrompt).toContain('主角登场即杀伐果断')
    expect(revisionPrompt).toContain('showdown_checks')
    expect(revisionPrompt).toContain('高潮对抗')
    expect(revisionPrompt).toContain('补爽点释放强度')
    expect(revisionPrompt).toContain('群众层/中间层/核心层')
    expect(revisionPrompt).toContain('反派出A')
    expect(revisionPrompt).toContain('预设B')
    expect(revisionPrompt).toContain('不一击必杀时必须有明确理由')
    expect(revisionPrompt).toContain('急-缓-急')
    expect(shouldReviseBlock).toContain('showdown_checks')
    expect(reviewNormalizeBlock).toContain('showdown_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.showdown_checks')
  })

  test('asks prose self review and revision to enforce oh-story bridge unit checks', () => {
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

    expect(reviewPrompt).toContain('chapter_target.bridge_unit_contract')
    expect(reviewPrompt).toContain('bridge_unit_checks')
    expect(reviewPrompt).toContain('四章一桥段')
    expect(reviewPrompt).toContain('连续 2 章没有目标推进')
    expect(revisionPrompt).toContain('bridge_unit_checks')
    expect(revisionPrompt).toContain('桥段节奏')
    expect(revisionPrompt).toContain('补连续期待')
    expect(revisionPrompt).toContain('高潮中埋钩子')
    expect(revisionPrompt).toContain('连续小期待')
    expect(shouldReviseBlock).toContain('bridge_unit_checks')
    expect(reviewNormalizeBlock).toContain('bridge_unit_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.bridge_unit_checks')
  })

  test('asks prose self review and revision to enforce oh-story upgrade rhythm checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityUpgradeRhythmRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.upgrade_rhythm_contract')
    expect(reviewPrompt).toContain('upgrade_rhythm_checks')
    expect(reviewPrompt).toContain('升级感三步法')
    expect(reviewPrompt).toContain('升级后能完成以前做不到的事')
    expect(reviewPrompt).toContain('金手指演进')
    expect(reviewPrompt).toContain('核心作用可发展但不能突然换赛道')
    expect(reviewPrompt).toContain('金手指简单是核心')
    expect(reviewPrompt).toContain('一眼就懂')
    expect(reviewPrompt).toContain('金手指多维成长')
    expect(reviewPrompt).toContain('词条、功能、品质')
    expect(reviewPrompt).toContain('金手指 + 矛盾')
    expect(reviewPrompt).toContain('刚好解决当前矛盾')
    expect(reviewPrompt).toContain('金手指反馈法')
    expect(reviewPrompt).toContain('掺杂在故事里')
    expect(revisionPrompt).toContain('upgrade_rhythm_checks')
    expect(revisionPrompt).toContain('升级节奏')
    expect(revisionPrompt).toContain('金手指演进')
    expect(revisionPrompt).toContain('金手指简单')
    expect(revisionPrompt).toContain('金手指多维成长')
    expect(revisionPrompt).toContain('词条、功能、品质')
    expect(revisionPrompt).toContain('金手指必须刚好解决当前矛盾')
    expect(revisionPrompt).toContain('金手指带来的变化过程掺进故事')
    expect(shouldReviseBlock).toContain('upgrade_rhythm_checks')
    expect(reviewNormalizeBlock).toContain('upgrade_rhythm_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.upgrade_rhythm_checks')
    expect(riskCarryOverBlock).toContain('upgrade_rhythm_checks')
    expect(riskCarryOverBlock).toContain('升级节奏')
  })

  test('asks prose self review and revision to enforce oh-story conflict structure checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityConflictStructureRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.conflict_structure_contract')
    expect(reviewPrompt).toContain('conflict_structure_checks')
    expect(reviewPrompt).toContain('言语->行动')
    expect(reviewPrompt).toContain('压势不压人')
    expect(reviewPrompt).toContain('矛盾网')
    expect(reviewPrompt).toContain('2-3条矛盾线')
    expect(reviewPrompt).toContain('有进无出')
    expect(reviewPrompt).toContain('非踏入不可')
    expect(revisionPrompt).toContain('conflict_structure_checks')
    expect(revisionPrompt).toContain('冲突结构')
    expect(revisionPrompt).toContain('激活或加深')
    expect(revisionPrompt).toContain('有进无出')
    expect(shouldReviseBlock).toContain('conflict_structure_checks')
    expect(reviewNormalizeBlock).toContain('conflict_structure_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.conflict_structure_checks')
    expect(riskCarryOverBlock).toContain('conflict_structure_checks')
    expect(riskCarryOverBlock).toContain('冲突结构')
  })

  test('asks prose self review and revision to enforce oh-story character behavior checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityCharacterBehaviorRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.character_behavior_contract')
    expect(reviewPrompt).toContain('character_behavior_checks')
    expect(reviewPrompt).toContain('主角行为三必须')
    expect(reviewPrompt).toContain('三层标签反差')
    expect(reviewPrompt).toContain('人设强关联')
    expect(reviewPrompt).toContain('每个重要角色至少 3 个强关联设定')
    expect(reviewPrompt).toContain('反派建立四要素')
    expect(reviewPrompt).toContain('实力展示')
    expect(reviewPrompt).toContain('真实威胁')
    expect(reviewPrompt).toContain('反派也有梦想')
    expect(reviewPrompt).toContain('自己故事的主人公')
    expect(reviewPrompt).toContain('理念冲突')
    expect(reviewPrompt).toContain('反派层级表')
    expect(reviewPrompt).toContain('篇幅与层级匹配')
    expect(reviewPrompt).toContain('最终Boss从第一章就有伏笔')
    expect(reviewPrompt).toContain('角色卡必备项')
    expect(reviewPrompt).toContain('配角退场规划')
    expect(reviewPrompt).toContain('行为重复点')
    expect(reviewPrompt).toContain('人推事件')
    expect(reviewPrompt).toContain('主角红线')
    expect(reviewPrompt).toContain('身份/金手指对齐')
    expect(revisionPrompt).toContain('character_behavior_checks')
    expect(revisionPrompt).toContain('角色行为')
    expect(revisionPrompt).toContain('强关联')
    expect(revisionPrompt).toContain('反派分量')
    expect(revisionPrompt).toContain('终极意图')
    expect(revisionPrompt).toContain('反派自我叙事')
    expect(revisionPrompt).toContain('创伤')
    expect(revisionPrompt).toContain('反派层级')
    expect(revisionPrompt).toContain('退场')
    expect(revisionPrompt).toContain('行为重复点')
    expect(revisionPrompt).toContain('人推事件')
    expect(revisionPrompt).toContain('主角红线')
    expect(shouldReviseBlock).toContain('character_behavior_checks')
    expect(reviewNormalizeBlock).toContain('character_behavior_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.character_behavior_checks')
    expect(riskCarryOverBlock).toContain('character_behavior_checks')
    expect(riskCarryOverBlock).toContain('角色行为')
  })

  test('asks prose self review and revision to enforce oh-story asset linkage checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityAssetLinkageRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.asset_linkage_contract')
    expect(reviewPrompt).toContain('asset_linkage_checks')
    expect(reviewPrompt).toContain('孤立资产')
    expect(reviewPrompt).toContain('功能、归属、触发条件、限制、后果')
    expect(reviewPrompt).toContain('道具能力展示的8步期待模板')
    expect(reviewPrompt).toContain('鸡肋成神器')
    expect(revisionPrompt).toContain('asset_linkage_checks')
    expect(revisionPrompt).toContain('资产挂钩')
    expect(revisionPrompt).toContain('道具能力展示')
    expect(revisionPrompt).toContain('宝物功能强大')
    expect(shouldReviseBlock).toContain('asset_linkage_checks')
    expect(reviewNormalizeBlock).toContain('asset_linkage_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.asset_linkage_checks')
    expect(riskCarryOverBlock).toContain('asset_linkage_checks')
    expect(riskCarryOverBlock).toContain('资产挂钩')
  })

  test('asks prose self review and revision to enforce oh-story state tracking checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityStateTrackingRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.state_tracking_contract')
    expect(reviewPrompt).toContain('state_tracking_checks')
    expect(reviewPrompt).toContain('source_readiness_checks')
    expect(reviewPrompt).toContain('来源就绪表')
    expect(reviewPrompt).toContain('本节速记')
    expect(reviewPrompt).toContain('角色状态、相关伏笔/前史、世界约束')
    expect(revisionPrompt).toContain('state_tracking_checks')
    expect(revisionPrompt).toContain('source_readiness_checks')
    expect(revisionPrompt).toContain('状态筛选')
    expect(revisionPrompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.status_filter_receipts')
    expect(revisionPrompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks')
    expect(shouldReviseBlock).toContain('state_tracking_checks')
    expect(shouldReviseBlock).toContain('source_readiness_checks')
    expect(reviewNormalizeBlock).toContain('state_tracking_checks')
    expect(reviewNormalizeBlock).toContain('source_readiness_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.state_tracking_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.source_readiness_checks')
    expect(reviewNormalizeBlock).toContain('appendMissingStatusFilterReceiptCheck')
    expect(reviewNormalizeBlock).toContain('statusFilterReceiptChecks')
    expect(reviewNormalizeBlock).toContain('source_readiness_checks || section?.sourceReadinessChecks')
    expect(reviewNormalizeBlock).toContain('const deterministicSourceReadinessChecks = buildSourceReadinessChecks(contextPackage)')
    expect(reviewNormalizeBlock).toContain('...deterministicSourceReadinessChecks')
    expect(riskCarryOverBlock).toContain('state_tracking_checks')
    expect(riskCarryOverBlock).toContain('状态筛选')
    const sourceReadinessRiskStart = riskSource.indexOf('export function proseQualitySourceReadinessRisks')
    const sourceReadinessRiskBlock = riskSource.slice(
      sourceReadinessRiskStart,
      riskSource.indexOf('\nexport function', sourceReadinessRiskStart + 1),
    )
    expect(sourceReadinessRiskBlock).toContain('source_readiness_checks')
  })

  test('asks prose self review and revision to enforce oh-story intent confirmation checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityIntentConfirmationRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.intent_confirmation_contract')
    expect(reviewPrompt).toContain('intent_confirmation_checks')
    expect(reviewPrompt).toContain('intent_field')
    expect(reviewPrompt).toContain('expected_intent')
    expect(reviewPrompt).toContain('delivered_evidence')
    expect(reviewPrompt).toContain('blueprint_link')
    expect(reviewPrompt).toContain('情绪+节奏+模块+文风指令')
    expect(reviewPrompt).toContain('内容概括决定起承转合')
    expect(revisionPrompt).toContain('intent_confirmation_checks')
    expect(revisionPrompt).toContain('意图确认')
    expect(shouldReviseBlock).toContain('intent_confirmation_checks')
    expect(reviewNormalizeBlock).toContain('intent_confirmation_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.intent_confirmation_checks')
    expect(reviewNormalizeSetupBlock).toContain('preDraftExecutionReceiptSections(reviewPayload)')
    expect(reviewNormalizeBlock).toContain('section?.intent_confirmation_checks || section?.intentConfirmationChecks')
    expect(riskCarryOverBlock).toContain('intent_confirmation_checks')
    expect(riskCarryOverBlock).toContain('意图确认')
  })

  test('asks prose self review and revision to enforce write-preparation execution checks', () => {
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
    const structuredFieldsSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/structured-review-fields.ts'), 'utf8')
    const structuredFieldsBlock = structuredFieldsSource.slice(
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_CHECK_FIELDS'),
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_REQUIRED_FIELDS'),
    )
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityWritePreparationRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('write_preparation_checks')
    expect(reviewPrompt).toContain('写前准备')
    expect(reviewPrompt).toContain('creation_contract_checklist')
    expect(reviewPrompt).toContain('创作契约')
    expect(revisionPrompt).toContain('write_preparation_checks')
    expect(revisionPrompt).toContain('写前准备')
    expect(revisionPrompt).toContain('creation_contract_checklist')
    expect(revisionPrompt).toContain('创作契约')
    expect(shouldReviseBlock).toContain('write_preparation_checks')
    expect(reviewNormalizeBlock).toContain('write_preparation_checks')
    expect(source).toContain('reviewPayload?.write_preparation_checks')
    expect(reviewNormalizeBlock).toContain('write_preparation_brief')
    expect(reviewNormalizeBlock).toContain('appendMissingContractReviewCheck')
    expect(reviewNormalizeBlock).toContain("'写前准备'")
    expect(source).toContain('preDraftExecutionReceiptSections(reviewPayload)')
    expect(structuredFieldsBlock).toContain('write_preparation_checks')
    expect(riskCarryOverBlock).toContain('write_preparation_checks')
    expect(riskCarryOverBlock).toContain('写前准备')
  })

  test('asks prose self review and revision to enforce next-chapter quality plan receipts', () => {
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
    const structuredFieldsSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/structured-review-fields.ts'), 'utf8')
    const structuredFieldsBlock = structuredFieldsSource.slice(
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_CHECK_FIELDS'),
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_REQUIRED_FIELDS'),
    )

    expect(reviewPrompt).toContain('next_chapter_quality_plan_receipts')
    expect(reviewPrompt).toContain('质量续航')
    expect(reviewPrompt).toContain('quality_focus')
    expect(reviewPrompt).toContain('opening_actions')
    expect(reviewPrompt).toContain('avoid_repetition')
    expect(reviewPrompt).toContain('next_chapter_quality_plan_receipts 中 opening_actions 的 evidence 必须来自前300字')
    expect(reviewPrompt).toContain('middle_actions 的 evidence 必须来自中段事件推进')
    expect(reviewPrompt).toContain('ending_actions 的 evidence 必须来自最后300字')
    expect(revisionPrompt).toContain('next_chapter_quality_plan_receipts')
    expect(revisionPrompt).toContain('next_chapter_quality_plan_receipts 中 opening_actions 的 evidence 必须来自修订后前300字')
    expect(revisionPrompt).toContain('middle_actions 的 evidence 必须来自修订后中段事件推进')
    expect(revisionPrompt).toContain('ending_actions 的 evidence 必须来自修订后最后300字')
    expect(shouldReviseBlock).toContain('next_chapter_quality_plan_receipts')
    expect(reviewNormalizeBlock).toContain('next_chapter_quality_plan_receipts')
    expect(reviewNormalizeBlock).toContain('preDraftReceiptChecks((section: any) => asArray(section?.next_chapter_quality_plan_receipts')
    expect(reviewNormalizeBlock).toContain('appendMissingNextChapterQualityPlanReceiptCheck')
    expect(structuredFieldsBlock).toContain('next_chapter_quality_plan_receipts')
  })

  test('returns next-chapter quality plan receipt sync for unattended post-delivery gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildNextChapterQualityPlanReceiptSyncReport')
    expect(generationReturnBlock).toContain('next_chapter_quality_plan_receipts_sync')
    expect(source).toContain('requires_next_chapter_quality_plan_receipts')
    expect(source).toContain('nextChapterQualityPlanReceiptSync.requires_receipts')
  })

  test('builds write-preparation receipt sync from pre-draft execution receipts', () => {
    const report = buildWritePreparationReceiptSyncReport(
      { title: '旧城维修师' },
      {
        id: 901,
        chapter_no: 18,
        raw_payload: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              write_preparation_checks: [
                {
                  key: 'source_gaps',
                  label: '来源缺口',
                  delivered: true,
                  evidence: '李玄把上一章铜锁裂纹拿给执事看，说明来源已承接。',
                  remaining_risk: '',
                },
                {
                  key: 'reader_payoff_focus',
                  label: '读者回报',
                  delivered: false,
                  evidence: '只写了“会让读者爽”。',
                  remaining_risk: '没有落成正文动作或对白证据。',
                },
              ],
            },
          },
        },
      },
      {
        chapter_target: {
          write_preparation_brief: {
            source_gaps: ['上一章铜锁裂纹'],
            reader_payoff_focus: ['证据反杀'],
          },
        },
      },
      '李玄把上一章铜锁裂纹拿给执事看。',
    )

    expect(report).toMatchObject({
      chapter_id: 901,
      chapter_no: 18,
      status: 'warn',
      label: '写前准备缺口 1',
      requires_receipts: true,
      receipt_count: 2,
      missed_count: 1,
    })
    expect(report.missed[0]).toMatchObject({
      key: 'reader_payoff_focus',
      label: '读者回报',
      text: '没有落成正文动作或对白证据。',
    })
    expect(report.next_actions.join('｜')).toContain('write_preparation_checks')
  })

  test('keeps write-preparation receipt sync open when delivered evidence cannot be located in prose', () => {
    const report = buildWritePreparationReceiptSyncReport(
      { title: '旧城维修师' },
      { id: 902, chapter_no: 19, title: '证据错位' },
      {
        chapter_target: {
          write_preparation_brief: {
            source_gaps: ['上一章青玉簪去向'],
          },
        },
      },
      '李玄只递出旧账，执事当场改口。',
      {
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              write_preparation_checks: [
                {
                  key: 'source_gaps',
                  label: '来源缺口',
                  delivered: true,
                  evidence: '林青禾在雨巷交出青玉簪。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'source_gaps',
      label: '来源缺口',
    })
    expect(report.missed[0].text).toContain('无法定位')
  })

  test('keeps write-preparation receipt sync open when staged delivery-risk evidence lands in the wrong section', () => {
    const chapterText = [
      '李玄刚推门，林青禾只递出半枚印纹，先把旧印归属压回现场。',
      '第一幕继续追认来源边界。'.repeat(40),
      '他走到阵堂深处，才让账册缺页变成执事必须改口的新证据。',
      '中段继续推进资产边界。'.repeat(40),
      '钟声响起前，账册背页忽然浮出下一枚旧印的名字。',
    ].join('')
    const report = buildWritePreparationReceiptSyncReport(
      { title: '旧城维修师' },
      { id: 903, chapter_no: 20, title: '落点错位' },
      {
        chapter_target: {
          write_preparation_brief: {
            delivery_risk_actions: [
              '开篇动作：前300字必须递出半枚印纹。',
              '中段动作：账册缺页必须改变执事选择。',
              '章末动作：旧印名字必须形成下一章钩子。',
            ],
          },
        },
      },
      chapterText,
      {
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              write_preparation_checks: [
                {
                  key: 'delivery_risk_actions.opening_actions',
                  label: '开篇动作',
                  delivered: true,
                  evidence: '他走到阵堂深处，才让账册缺页变成执事必须改口的新证据。',
                  remaining_risk: '',
                },
                {
                  key: 'delivery_risk_actions.middle_actions',
                  label: '中段动作',
                  delivered: true,
                  evidence: '李玄刚推门，林青禾只递出半枚印纹，先把旧印归属压回现场。',
                  remaining_risk: '',
                },
                {
                  key: 'delivery_risk_actions.ending_actions',
                  label: '章末动作',
                  delivered: true,
                  evidence: '他走到阵堂深处，才让账册缺页变成执事必须改口的新证据。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(3)
    expect(report.missed_count).toBe(3)
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('前300字')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('中段')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('最后300字')
  })

  test('returns write-preparation receipt sync for unattended post-delivery gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const draftReturnBlock = readPostDeliveryStoryStateUpdateSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildWritePreparationReceiptSyncReport')
    expect(draftReturnBlock).toContain('write_preparation_receipts_sync')
    expect(generationReturnBlock).toContain('write_preparation_receipts_sync')
  })

  test('returns Step 2 preparation syncs in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildSourceReadinessSyncReport(project, updated, finalReviewContextPackage, finalText)')
    expect(source).toContain('buildIntentConfirmationSyncReport(project, updated, finalReviewContextPackage, finalText)')
    expect(source).toContain('buildBenchmarkRecallSyncReport(project, updated, finalReviewContextPackage, finalText)')
    expect(source).toContain('buildStyleSampleSyncReport(project, updated, finalReviewContextPackage, finalText)')
    expect(generationReturnBlock).toContain('source_readiness_sync')
    expect(generationReturnBlock).toContain('intent_confirmation_sync')
    expect(generationReturnBlock).toContain('benchmark_recall_sync')
    expect(generationReturnBlock).toContain('style_sample_sync')
  })

  test('persists the style fingerprint snapshot through the story state machine update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')
    const generateSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const prepareStart = source.indexOf('const prepareStoryStateUpdate = async')
    const prepareEnd = source.indexOf('const updateStoryStateMachine = async', prepareStart)
    const prepareBlock = source.slice(prepareStart, prepareEnd > prepareStart ? prepareEnd : source.length)
    const acceptanceStart = generateSource.indexOf('acceptance = await commitNovelChapterAcceptance(')
    const acceptanceEnd = generateSource.indexOf('const updated = acceptance.chapter', acceptanceStart)
    const acceptanceBlock = generateSource.slice(acceptanceStart, acceptanceEnd)

    expect(prepareBlock).toContain('buildStyleFingerprintStateSnapshot(contextPackage, project, project.reference_config?.story_state || {})')
    expect(prepareBlock).toContain('stateDeltaWithStyleFingerprint')
    expect(prepareBlock).toContain('story_state: mergeStoryState(project.reference_config?.story_state || {}, stateDeltaWithStyleFingerprint, chapter)')
    expect(prepareBlock).toContain('payload.style_fingerprint = stateDeltaWithStyleFingerprint.style_fingerprint')
    expect(prepareBlock).toContain('next_reference_config: nextReferenceConfig')
    expect(acceptanceBlock).toContain('next_reference_config: preparedStoryStateUpdate.next_reference_config')
  })

  test('returns status filter receipt sync for unattended post-delivery gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildStatusFilterReceiptSyncReport')
    expect(generationReturnBlock).toContain('status_filter_receipts_sync')
    expect(source).toContain('requires_status_filter_receipts')
    expect(source).toContain('statusFilterReceiptSync.requires_receipts')
  })

  test('returns prose craft step-3 syncs for unattended post-delivery gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildProseCraftSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildPayoffSetupSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildSpectatorReactionSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('prose_craft_sync')
    expect(generationReturnBlock).toContain('payoff_setup_sync')
    expect(generationReturnBlock).toContain('spectator_reaction_sync')
  })

  test('returns story quality step-3 syncs in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildStoryLoopSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildInformationFlowSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildExpectationThresholdSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildEmotionalArcSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('story_loop_sync')
    expect(generationReturnBlock).toContain('information_flow_sync')
    expect(generationReturnBlock).toContain('expectation_threshold_sync')
    expect(generationReturnBlock).toContain('emotional_arc_sync')
  })

  test('returns narrative technique step-3 syncs in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildChapterHookSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildParagraphHookSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildSuspenseSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildReversalSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildShowdownSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildOpeningSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildBridgeUnitSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('chapter_hook_sync')
    expect(generationReturnBlock).toContain('paragraph_hook_sync')
    expect(generationReturnBlock).toContain('suspense_sync')
    expect(generationReturnBlock).toContain('reversal_sync')
    expect(generationReturnBlock).toContain('showdown_sync')
    expect(generationReturnBlock).toContain('opening_sync')
    expect(generationReturnBlock).toContain('bridge_unit_sync')
  })

  test('returns long-form contract syncs in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildContinuityHeatSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildConflictStructureSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildUpgradeRhythmSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildTargetReaderSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildGenrePositioningSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildPlotSpecialTopicsSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildFemaleAudienceSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildPlotDynamicsSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildCharacterRelationSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildReaderRetentionSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildCoreContractSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('continuity_heat_sync')
    expect(generationReturnBlock).toContain('conflict_structure_sync')
    expect(generationReturnBlock).toContain('upgrade_rhythm_sync')
    expect(generationReturnBlock).toContain('target_reader_sync')
    expect(generationReturnBlock).toContain('genre_positioning_sync')
    expect(generationReturnBlock).toContain('plot_special_topics_sync')
    expect(generationReturnBlock).toContain('female_audience_sync')
    expect(generationReturnBlock).toContain('plot_dynamics_sync')
    expect(generationReturnBlock).toContain('character_relation_sync')
    expect(generationReturnBlock).toContain('reader_retention_sync')
    expect(generationReturnBlock).toContain('core_contract_sync')
  })

  test('builds a plot special topics sync report from contract checks and prose evidence', async () => {
    const { buildPlotSpecialTopicsSyncReport } = await import('./novel-writing-service')
    expect(typeof buildPlotSpecialTopicsSyncReport).toBe('function')

    const report = buildPlotSpecialTopicsSyncReport(
      { title: '拳证星河' },
      { id: 2201, chapter_no: 27, title: '联考前夜' },
      {
        chapter_target: {
          plot_special_topics_contract: {
            matched_topics: ['金手指拆分与战力防崩', '都市高武情节模板', '三万字卡点倒推', '阵营剧情/手牌法'],
            goldfinger_design_rules: ['金手指拆分成面板/不倒退/重复提升'],
            genre_boundary_rules: ['金手指核心卖点循环必须在题材边界内'],
            urban_high_martial_rules: ['所有目标必须和钱挂钩'],
            launch_checkpoint_rules: ['三万字内无关卡点的装逼打脸一个字不要写'],
            faction_hand_rules: ['按实力高低排序各阵营角色'],
          },
        },
      },
      [
        '林骁打开面板，熟练度没有倒退，抽卡系统的重复提升让拳力涨了一截。',
        '全国联考名额和奖金挂钩，他必须先拿下武馆联赛资格。',
        '几个阵营按实力高低依次出牌，校队队长先压价，武馆教练再给出交换条件。',
      ].join('\n'),
    )

    expect(report.status).toBe('warn')
    expect(report.missed.map((item: any) => item.key)).toContain('launch_checkpoint_execution')
    expect(report.missed.map((item: any) => item.key)).not.toContain('goldfinger_execution')
    expect(report.summary).toContain('特殊题材')
  })

  test('returns serial quality assurance syncs in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildStoryDriveSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildCharacterArcSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildStyleBoundarySyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildInnovationSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildRunwaySyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildReaderExpectationSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildQualityAuditSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildBeatCoolingSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildReaderPayoffSyncReport(project, updated, contextPackage, finalText, story_state_update)')
    expect(generationReturnBlock).toContain('story_drive_sync')
    expect(generationReturnBlock).toContain('character_arc_sync')
    expect(generationReturnBlock).toContain('style_boundary_sync')
    expect(generationReturnBlock).toContain('innovation_sync')
    expect(generationReturnBlock).toContain('runway_sync')
    expect(generationReturnBlock).toContain('reader_expectation_sync')
    expect(generationReturnBlock).toContain('quality_audit_sync')
    expect(generationReturnBlock).toContain('beat_cooling_sync')
    expect(generationReturnBlock).toContain('reader_payoff_sync')
  })

  test('returns deterministic base step-3 syncs in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildProseMetaSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildChapterBlueprintSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildChapterTitleUniquenessSyncReport(generationChapters, updated)')
    expect(generationReturnBlock).toContain('prose_meta_sync')
    expect(generationReturnBlock).toContain('chapter_blueprint_sync')
    expect(generationReturnBlock).toContain('chapter_title_uniqueness_sync')
  })

  test('returns chapter handoff sync for unattended post-delivery gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildChapterHandoffSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('chapter_handoff_sync')
  })

  test('returns state tracking sync for unattended post-delivery gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildStateTrackingSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('state_tracking_sync')
  })

  test('returns punctuation tone sync for unattended post-delivery gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildPunctuationToneSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('punctuation_tone_sync')
  })

  test('returns asset linkage sync for unattended post-delivery gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildAssetLinkageSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('asset_linkage_sync')
  })

  test('asks prose self review and revision to enforce chapter handoff checks', () => {
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
    const structuredFieldsSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/structured-review-fields.ts'), 'utf8')
    const structuredFieldsBlock = structuredFieldsSource.slice(
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_CHECK_FIELDS'),
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_REQUIRED_FIELDS'),
    )

    expect(reviewPrompt).toContain('chapter_handoff_checks')
    expect(reviewPrompt).toContain('chapter_handoff_contract')
    expect(reviewPrompt).toContain('章首承接')
    expect(revisionPrompt).toContain('chapter_handoff_checks')
    expect(revisionPrompt).toContain('章首承接')
    expect(shouldReviseBlock).toContain('chapter_handoff_checks')
    expect(reviewNormalizeBlock).toContain('chapter_handoff_checks')
    expect(source).toContain('reviewPayload?.chapter_handoff_checks')
    expect(structuredFieldsBlock).toContain('chapter_handoff_checks')
  })

  test('wires deterministic chapter handoff hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicChapterHandoffChecks = [buildChapterHandoffDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicChapterHandoffChecks')
  })

  test('scans prose meta words outside the title line', () => {
    const hits = scanProseMetaLeaks([
      '第十五章 袖口旧印',
      '林青禾按住袖口，想起上一章那枚旧印。',
      '账册夹页里还藏着一处伏笔，读者会在这里明白代价。',
    ].join('\n'))

    expect(hits.map((item: any) => item.term)).toEqual(['上一章', '伏笔', '读者'])
    expect(hits[0].line).toBe(2)
    expect(hits[0].status).toBe('warn')
    expect(hits[0].fix).toContain('角色当下能感知')
  })

  test('asks prose self review and revision to enforce oh-story prose meta checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityProseMetaRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('prose_meta_checks')
    expect(reviewPrompt).toContain('第[一二三四五六七八九十百千万两0-9]+章|上一章|上章|前一章|本章|这一章|前文|后文|伏笔|细纲|读者')
    expect(reviewPrompt).toContain('角色当下能感知的事件锚点或相对时间')
    expect(revisionPrompt).toContain('prose_meta_checks')
    expect(revisionPrompt).toContain('工程词')
    expect(shouldReviseBlock).toContain('prose_meta_checks')
    expect(reviewNormalizeBlock).toContain('prose_meta_checks')
    expect(source).toContain('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')
    expect(riskCarryOverBlock).toContain('prose_meta_checks')
    expect(riskCarryOverBlock).toContain('工程词')
  })

  test('asks prose self review and revision to enforce oh-story story loop checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityStoryLoopRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.story_loop_contract')
    expect(reviewPrompt).toContain('story_loop_checks')
    expect(reviewPrompt).toContain('题材 + 金手指 + 主角身份')
    expect(reviewPrompt).toContain('循环模式')
    expect(reviewPrompt).toContain('小循环 -> 中循环 -> 大循环')
    expect(reviewPrompt).toContain('核心不扩展')
    expect(revisionPrompt).toContain('story_loop_checks')
    expect(revisionPrompt).toContain('故事循环')
    expect(revisionPrompt).toContain('小循环中必须铺垫大循环的期待')
    expect(revisionPrompt).toContain('同一核心卖点的不同角度')
    expect(shouldReviseBlock).toContain('story_loop_checks')
    expect(reviewNormalizeBlock).toContain('story_loop_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.story_loop_checks')
    expect(riskCarryOverBlock).toContain('story_loop_checks')
    expect(riskCarryOverBlock).toContain('故事循环')
  })

  test('asks prose self review and revision to enforce oh-story emotional arc checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityEmotionalArcRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.emotional_arc_contract')
    expect(reviewPrompt).toContain('emotional_arc_checks')
    expect(reviewPrompt).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(reviewPrompt).toContain('影响范围')
    expect(reviewPrompt).toContain('断期待禁止')
    expect(reviewPrompt).toContain('先入为主')
    expect(reviewPrompt).toContain('峰终定律')
    expect(reviewPrompt).toContain('结尾情绪强度')
    expect(reviewPrompt).toContain('三层情绪')
    expect(reviewPrompt).toContain('读者实际感受')
    expect(reviewPrompt).toContain('前反应')
    expect(reviewPrompt).toContain('以小搏大')
    expect(reviewPrompt).toContain('理念矛盾')
    expect(reviewPrompt).toContain('理念之争')
    expect(revisionPrompt).toContain('emotional_arc_checks')
    expect(revisionPrompt).toContain('情绪弧')
    expect(revisionPrompt).toContain('爽点递增')
    expect(revisionPrompt).toContain('先入为主')
    expect(revisionPrompt).toContain('峰终定律')
    expect(revisionPrompt).toContain('结尾情绪强度')
    expect(revisionPrompt).toContain('三层情绪')
    expect(revisionPrompt).toContain('读者实际感受')
    expect(revisionPrompt).toContain('前反应')
    expect(revisionPrompt).toContain('以小搏大')
    expect(revisionPrompt).toContain('理念矛盾')
    expect(revisionPrompt).toContain('追求和牺牲')
    expect(shouldReviseBlock).toContain('emotional_arc_checks')
    expect(reviewNormalizeBlock).toContain('emotional_arc_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.emotional_arc_checks')
    expect(riskCarryOverBlock).toContain('emotional_arc_checks')
    expect(riskCarryOverBlock).toContain('情绪弧')
  })

  test('asks prose self review and revision to enforce oh-story chapter hook checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityChapterHookRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.chapter_hook_contract')
    expect(reviewPrompt).toContain('chapter_hook_checks')
    expect(reviewPrompt).toContain('chapter_hook_quality_checks')
    expect(reviewPrompt).toContain('章首 7 式')
    expect(reviewPrompt).toContain('章尾 13 式')
    expect(revisionPrompt).toContain('chapter_hook_checks')
    expect(revisionPrompt).toContain('chapter_hook_quality_checks')
    expect(revisionPrompt).toContain('章级钩子')
    expect(shouldReviseBlock).toContain('chapter_hook_checks')
    expect(shouldReviseBlock).toContain('chapter_hook_quality_checks')
    expect(reviewNormalizeBlock).toContain('chapter_hook_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.chapter_hook_checks')
    expect(reviewNormalizeBlock).toContain('chapter_hook_quality_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.chapter_hook_quality_checks')
    expect(riskCarryOverBlock).toContain('chapter_hook_checks')
    expect(riskCarryOverBlock).toContain('chapter_hook_quality_checks')
    expect(riskCarryOverBlock).toContain('章级钩子')
  })

  test('asks prose self review and revision to enforce oh-story paragraph hook checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityParagraphHookRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.paragraph_hook_contract')
    expect(reviewPrompt).toContain('paragraph_hook_checks')
    expect(reviewPrompt).toContain('段落级钩子 11 种')
    expect(reviewPrompt).toContain('围观者质量层级')
    expect(revisionPrompt).toContain('paragraph_hook_checks')
    expect(revisionPrompt).toContain('段落级钩子')
    expect(shouldReviseBlock).toContain('paragraph_hook_checks')
    expect(reviewNormalizeBlock).toContain('paragraph_hook_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.paragraph_hook_checks')
    expect(riskCarryOverBlock).toContain('paragraph_hook_checks')
    expect(riskCarryOverBlock).toContain('段落级钩子')
  })

  test('asks prose self review and revision to enforce oh-story suspense checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualitySuspenseRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.suspense_contract')
    expect(reviewPrompt).toContain('suspense_checks')
    expect(reviewPrompt).toContain('四种悬念信息顺序模板')
    expect(reviewPrompt).toContain('悬念强度5级')
    expect(reviewPrompt).toContain('期待链')
    expect(reviewPrompt).toContain('至少两条期待线')
    expect(reviewPrompt).toContain('读者预知法')
    expect(reviewPrompt).toContain('底牌前置法')
    expect(reviewPrompt).toContain('多线悬念')
    expect(reviewPrompt).toContain('伏笔不是谜语人')
    expect(reviewPrompt).toContain('信息延迟超过3章')
    expect(revisionPrompt).toContain('suspense_checks')
    expect(revisionPrompt).toContain('悬念编排')
    expect(revisionPrompt).toContain('信息差运用')
    expect(revisionPrompt).toContain('读者预知法')
    expect(revisionPrompt).toContain('底牌前置法')
    expect(revisionPrompt).toContain('伏笔不是谜语人')
    expect(shouldReviseBlock).toContain('suspense_checks')
    expect(reviewNormalizeBlock).toContain('suspense_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.suspense_checks')
    expect(riskCarryOverBlock).toContain('suspense_checks')
    expect(riskCarryOverBlock).toContain('悬念编排')
  })

  test('asks prose self review and revision to enforce oh-story reversal checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityReversalRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.reversal_contract')
    expect(reviewPrompt).toContain('reversal_checks')
    expect(reviewPrompt).toContain('反转类型')
    expect(reviewPrompt).toContain('误导技巧')
    expect(revisionPrompt).toContain('reversal_checks')
    expect(revisionPrompt).toContain('反转设计')
    expect(shouldReviseBlock).toContain('reversal_checks')
    expect(reviewNormalizeBlock).toContain('reversal_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.reversal_checks')
    expect(riskCarryOverBlock).toContain('reversal_checks')
    expect(riskCarryOverBlock).toContain('反转设计')
  })

  test('asks prose self review and revision to enforce oh-story opening checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityOpeningRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.opening_contract')
    expect(reviewPrompt).toContain('opening_checks')
    expect(reviewPrompt).toContain('300 字内主角登场')
    expect(reviewPrompt).toContain('三大基点')
    expect(reviewPrompt).toContain('开头五要诀')
    expect(reviewPrompt).toContain('简单/不偏/快/爽/不平')
    expect(revisionPrompt).toContain('opening_checks')
    expect(revisionPrompt).toContain('开篇设计')
    expect(revisionPrompt).toContain('简单/不偏/快/爽/不平')
    expect(shouldReviseBlock).toContain('opening_checks')
    expect(reviewNormalizeBlock).toContain('opening_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.opening_checks')
    expect(riskCarryOverBlock).toContain('opening_checks')
    expect(riskCarryOverBlock).toContain('开篇设计')
  })

  test('asks prose self review to enforce opening hook strategy contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(reviewPrompt).toContain('opening_strategy_contract')
    expect(reviewPrompt).toContain('hook_type')
    expect(reviewPrompt).toContain('事件噱头')
    expect(reviewPrompt).toContain('金手指噱头')
    expect(reviewPrompt).toContain('人设噱头')
    expect(reviewPrompt).toContain('不能混用')
    expect(reviewPrompt).toContain('mainline_graft')
    expect(reviewPrompt).toContain('first_5_chapter_promise')
    expect(reviewPrompt).toContain('threshold_ladder')
    expect(reviewPrompt).toContain('forbidden_mixing')
    expect(reviewPrompt).toContain('opening_strategy_contract_mixed_hook_type')
    expect(reviewPrompt).toContain('opening_checks')
  })

  test('carries opening hook strategy failures into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二条规则' },
      [
        { id: 2, chapter_no: 2, title: '十点门槛' },
        { id: 3, chapter_no: 3, title: '第二条规则' },
      ],
      [
        {
          id: 610,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                opening_checks: [
                  {
                    key: 'opening_strategy_contract_mixed_hook_type',
                    label: '开篇噱头策略',
                    status: 'fail',
                    evidence: '正文同时把第一章写成规则事件开局和系统觉醒说明书。',
                    fix: '下一章必须回到事件噱头：用十点门槛推进规则事件，不要再补系统说明书。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = {
      title: '灰域双生',
      reference_config: {},
    }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '第二条规则',
        summary: '继续推进规则事件，不转成系统说明。',
        conflict: '林野想靠蛮力开门，沈砚要求按十点门槛验证。',
        ending_hook: '门外响起第二条规则。',
        scene_cards: [
          { scene_no: 1, title: '二次敲门', conflict: '十点门槛继续压迫两人选择。' },
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
      { chapter_no: 3, title: '第二条规则' },
    )

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('开篇设计：开篇缺口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('开篇噱头策略')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('事件噱头')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不要再补系统说明书')
    expect(prompt).toContain('开篇噱头策略')
    expect(prompt).toContain('事件噱头')
    expect(prompt).toContain('不要再补系统说明书')
  })

  test('carries prose review opening check execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门槛白线' },
      [
        { id: 3, chapter_no: 3, title: '第三声敲门' },
        { id: 4, chapter_no: 4, title: '门槛白线' },
      ],
      [
        {
          id: 611,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                opening_checks: [
                  {
                    key: 'opening_first_1000_expectation_missing',
                    label: '开篇期待点',
                    status: 'fail',
                    protagonist_entry: '主角第420字才出现。',
                    first_300_goal: '前300字没有让主角追问门槛白线。',
                    first_1000_expectation: '1000字内没有血缘系统反馈。',
                    opening_principle: '不快：先写三段校规说明。',
                    evidence: '正文前三段都是校规说明。',
                    fix: '下一章第一段用门槛白线逼主角做选择。',
                    remaining_risk: '下一章不能再从校规说明书开场。',
                  },
                  {
                    key: 'opening_entry_ok',
                    label: '主角登场',
                    status: 'pass',
                    protagonist_entry: '主角第一段登场。',
                    first_300_goal: '前300字已有目标。',
                    first_1000_expectation: '1000字内已有期待点。',
                    opening_principle: '快。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门槛白线',
        summary: '主角追问门槛白线和血缘系统反馈。',
        conflict: '规则要求他先跨线，系统却只给出半条反馈。',
        ending_hook: '白线背后出现第二个家属签名。',
        scene_cards: [
          { scene_no: 1, title: '白线问答', conflict: '门槛白线逼主角立刻选择。' },
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
      { chapter_no: 4, title: '门槛白线' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修开篇设计')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('开篇设计：开篇缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('opening_checks.开篇期待点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('主角第420字才出现')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('1000字内没有血缘系统反馈')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章不能再从校规说明书开场')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('主角第一段登场')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('门槛白线')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('1000字')
    expect(prompt).toContain('opening_checks.开篇期待点')
    expect(prompt).toContain('血缘系统反馈')
    expect(prompt).toContain('校规说明书开场')
  })

  test('maps delivery-risk carry-over into existing scene cards before building prose prompts', () => {
    const project = {
      title: '灰域双生',
      reference_config: {},
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 4,
        title: '旧账审判',
        summary: '主角用旧账反制执事。',
        conflict: '执事拒认旧账，盟友立场摇摆。',
        ending_hook: '第三个名字出现在旧账背面。',
        delivery_risk_carry_over: {
          opening_actions: ['前300字先让旧账压迫重新逼近主角'],
          middle_actions: ['中段用新证据推动目标并改变盟友立场'],
          ending_actions: ['章末抛出第三个名字作为追读钩子'],
          forbidden_repeats: ['不要再用旁白宣布风险已修复'],
        },
        scene_cards: [
          { scene_no: 1, title: '旧账压门', purpose: '主角带着账册入场', beat: '主角抵达审判厅' },
          { scene_no: 2, title: '证据翻面', purpose: '主角逼执事回应证据', conflict: '执事拒认旧账', beat: '主角公开账册缺页' },
          { scene_no: 3, title: '新名单落地', purpose: '用名单留下下一章追问', beat: '第三个名字出现' },
        ],
      },
      preflight: { ready: true, blockers: [] },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      contextPackage,
      null,
      { chapter_no: 4, title: '旧账审判' },
    )

    expect(prompt).toContain('"serial_risk_repairs"')
    expect(prompt).toContain('delivery_risk_carry_over')
    expect(prompt).toContain('质量续航')
    expect(prompt).toContain('"recent_fatigue_action": "前300字先让旧账压迫重新逼近主角"')
    expect(prompt).toContain('"state_changes_expected"')
    expect(prompt).toContain('中段用新证据推动目标并改变盟友立场')
    expect(prompt).toContain('"ending_hook_seed": "章末抛出第三个名字作为追读钩子"')
    expect(prompt).toContain('不要再用旁白宣布风险已修复')
  })

  test('keeps paragraph prose prompt within budget when context package has bulky assets', () => {
    const noisyText = 'RAW_NOISE_BLOCK_不要把整段资产噪音塞进正文任务。'.repeat(1000)
    const project = {
      title: '灰域双生',
      reference_config: {},
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '玻璃娃娃的眼泪',
        summary: '主角必须确认玻璃娃娃和旧账之间的关系。',
        conflict: '旧账执事阻止主角触碰玻璃娃娃。',
        ending_hook: '玻璃娃娃眼眶里浮出第三个名字。',
        scene_cards: [
          {
            scene_no: 1,
            title: '旧账压门',
            purpose: '主角带着旧账进入审判厅',
            conflict: '执事拒绝承认旧账缺页',
            reader_payoff: '确认玻璃娃娃不是装饰，而是证据容器。',
          },
        ],
      },
      setting_context: {
        entities: Array.from({ length: 80 }, (_, index) => ({
          id: index + 1,
          name: `资产${index + 1}`,
          entity_type: 'item',
          summary: noisyText,
          constraints_json: { knowledge_scope: noisyText, forbidden_reveal: noisyText },
          state_json: { current_owner: noisyText, risk: noisyText },
        })),
      },
      story_state: {
        progress_summary: { notes: noisyText },
        daily_context_snapshot: { current_scene: noisyText, pending_clues: [noisyText] },
        character_positions: Object.fromEntries(
          Array.from({ length: 40 }, (_, index) => [`角色${index + 1}`, noisyText]),
        ),
      },
      relationship_graph: {
        diagnostics: Array.from({ length: 120 }, (_, index) => ({
          id: index + 1,
          issue: noisyText,
        })),
      },
      writing_bible: {
        style: noisyText,
        forbidden: noisyText,
      },
      preflight: { ready: true, blockers: [] },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      contextPackage,
      { generation_prompt_addendum: noisyText },
      { chapter_no: 2, title: '玻璃娃娃的眼泪' },
    )

    expect(prompt.length).toBeLessThanOrEqual(180000)
    expect(prompt).toContain('【结构化上下文包】')
    expect(prompt).toContain('玻璃娃娃的眼泪')
    expect(prompt).toContain('旧账压门')
    expect(prompt).not.toContain(noisyText.slice(0, 1000))
  })

  test('asks prose self review and revision to enforce oh-story prose craft checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityProseCraftRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.prose_craft_contract')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(reviewPrompt).toContain('身体细节替代情绪词')
    expect(reviewPrompt).toContain('三维度揉进')
    expect(reviewPrompt).toContain('间接描写法')
    expect(reviewPrompt).toContain('侧面反应')
    expect(reviewPrompt).toContain('三机位法')
    expect(reviewPrompt).toContain('机位1')
    expect(reviewPrompt).toContain('机位2')
    expect(reviewPrompt).toContain('然后呢')
    expect(reviewPrompt).toContain('信息点')
    expect(reviewPrompt).toContain('core_emotion_alignment_rules')
    expect(reviewPrompt).toContain('情节、人设、冲突、细节')
    expect(reviewPrompt).toContain('baimiao_sensory_rules')
    expect(reviewPrompt).toContain('白描')
    expect(reviewPrompt).toContain('五感')
    expect(reviewPrompt).toContain('dynamic_description_rules')
    expect(reviewPrompt).toContain('动态描写优于静态描写')
    expect(reviewPrompt).toContain('动作和反应')
    expect(reviewPrompt).toContain('shot_rhythm_rules')
    expect(reviewPrompt).toContain('镜头与分镜思维')
    expect(reviewPrompt).toContain('远景/中景/近景/特写')
    expect(reviewPrompt).toContain('transition_bridge_rules')
    expect(reviewPrompt).toContain('场景切换与转场')
    expect(reviewPrompt).toContain('相似物')
    expect(reviewPrompt).toContain('description_limits')
    expect(reviewPrompt).toContain('水分控制')
    expect(reviewPrompt).toContain('anti_ai_smell_rules')
    expect(reviewPrompt).toContain('高危词')
    expect(reviewPrompt).toContain('章末总结体')
    expect(reviewPrompt).toContain('叠加式描写')
    expect(revisionPrompt).toContain('prose_craft_checks')
    expect(revisionPrompt).toContain('正文工艺')
    expect(revisionPrompt).toContain('间接描写法')
    expect(revisionPrompt).toContain('不要直接宣布')
    expect(revisionPrompt).toContain('三机位法')
    expect(revisionPrompt).toContain('设定都由冲突引出')
    expect(revisionPrompt).toContain('然后呢')
    expect(revisionPrompt).toContain('接上')
    expect(revisionPrompt).toContain('围绕核心情绪')
    expect(revisionPrompt).toContain('每个动作、物件、冲突和反应')
    expect(revisionPrompt).toContain('白描')
    expect(revisionPrompt).toContain('最少的字')
    expect(revisionPrompt).toContain('感官')
    expect(revisionPrompt).toContain('动态描写')
    expect(revisionPrompt).toContain('动作和反应')
    expect(revisionPrompt).toContain('环境铺陈')
    expect(revisionPrompt).toContain('镜头节奏')
    expect(revisionPrompt).toContain('远景、中景、近景或特写')
    expect(revisionPrompt).toContain('快节奏')
    expect(revisionPrompt).toContain('场景切换')
    expect(revisionPrompt).toContain('时间跳转')
    expect(revisionPrompt).toContain('声音或光影')
    expect(revisionPrompt).toContain('水分控制')
    expect(revisionPrompt).toContain('删掉读者不会困惑')
    expect(revisionPrompt).toContain('高危词')
    expect(revisionPrompt).toContain('章末总结体')
    expect(revisionPrompt).toContain('叠加式描写')
    expect(shouldReviseBlock).toContain('prose_craft_checks')
    expect(reviewNormalizeBlock).toContain('prose_craft_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.prose_craft_checks')
    expect(riskCarryOverBlock).toContain('prose_craft_checks')
    expect(riskCarryOverBlock).toContain('正文工艺')
  })

  test('asks prose generation self review and revision to enforce oh-story subject name rhythm', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const promptSectionsSource = readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const proseCraftSnippetStart = promptSectionsSource.indexOf('function formatProseCraftPromptSnippet')
    const proseCraftSnippetEnd = promptSectionsSource.indexOf('function formatQualityAuditPhaseChecklist', proseCraftSnippetStart)
    const proseCraftPromptSource = `${prosePromptBlock}\n${promptSectionsSource.slice(proseCraftSnippetStart, proseCraftSnippetEnd)}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetEnd).toBeGreaterThan(proseCraftSnippetStart)
    expect(proseCraftPromptSource).toContain('主语与名字节奏')
    expect(proseCraftPromptSource).toContain('段首、场景切换、多人同场、视角重置')
    expect(proseCraftPromptSource).toContain('同一动作链/同一段内部')
    expect(proseCraftPromptSource).toContain('优先用“他/她”、动作承接或省略主语')
    expect(proseCraftPromptSource).toContain('不要连续多句都以同一角色名开头')
    expect(reviewPrompt).toContain('主语与名字节奏')
    expect(reviewPrompt).toContain('每句都在报名字')
    expect(reviewPrompt).toContain('指代不清')
    expect(revisionPrompt).toContain('主语与名字节奏')
    expect(revisionPrompt).toContain('段首点名建立主语')
    expect(revisionPrompt).toContain('段中用代词/省略流动')
  })

  test('asks prose generation self review and revision to enforce oh-story natural paragraph rhythm', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('自然节奏重排')
    expect(prosePromptBlock).toContain('断段按镜头/信息变化')
    expect(prosePromptBlock).toContain('新动作、新物件、新信息、新对话、视线转移、场景结束')
    expect(prosePromptBlock).toContain('不要把完整推理链切成机械碎片')
    expect(reviewPrompt).toContain('自然节奏重排')
    expect(reviewPrompt).toContain('连续多个极短段仍属于同一镜头')
    expect(reviewPrompt).toContain('一段塞进多个动作/信息/视线切换')
    expect(revisionPrompt).toContain('自然节奏重排')
    expect(revisionPrompt).toContain('同一镜头里的动作、感知和反应')
    expect(revisionPrompt).toContain('只在新动作、新信息、对话或转折处断段')
  })

  test('asks prose generation self review and revision to enforce oh-story specific character-count expression guard', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('具体字数表达校验')
    expect(prosePromptBlock).toContain('这五个字 / 短短四字 / 三个字一落 / 八个字砸下去')
    expect(prosePromptBlock).toContain('这句话一落')
    expect(reviewPrompt).toContain('具体字数表达校验')
    expect(reviewPrompt).toContain('短短四字')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(revisionPrompt).toContain('具体字数表达')
    expect(revisionPrompt).toContain('这句话一落')
  })

  test('asks prose generation self review and revision to enforce oh-story external fact research guard', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('外部事实查证')
    expect(prosePromptBlock).toContain('历史年代、地理方位、职业细节')
    expect(prosePromptBlock).toContain('不得编造')
    expect(prosePromptBlock).toContain('资料研究')
    expect(reviewPrompt).toContain('外部事实查证')
    expect(reviewPrompt).toContain('factual_checks')
    expect(reviewPrompt).toContain('category=factual')
    expect(revisionPrompt).toContain('factual_checks')
    expect(revisionPrompt).toContain('不得把未查证内容改写成确定事实')
  })

  test('asks prose generation self review and revision to enforce oh-story supporting-character buffer zones', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('配角攻略缓冲区')
    expect(prosePromptBlock).toContain('信息差、地位差距、亲密度差距或信任程度')
    expect(prosePromptBlock).toContain('配角不能像 NPC 一样站着等主角触发')
    expect(reviewPrompt).toContain('配角攻略缓冲区')
    expect(reviewPrompt).toContain('buffer_zone')
    expect(reviewPrompt).toContain('character_relation_checks')
    expect(revisionPrompt).toContain('配角攻略缓冲区')
    expect(revisionPrompt).toContain('信息差、地位差距、亲密度差距或信任程度')
  })

  test('asks prose generation self review and revision to enforce oh-story section density diagnosis', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const promptSectionsSource = readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const proseCraftSnippetStart = promptSectionsSource.indexOf('function formatProseCraftPromptSnippet')
    const proseCraftSnippetEnd = promptSectionsSource.indexOf('function formatQualityAuditPhaseChecklist', proseCraftSnippetStart)
    const proseCraftPromptSource = `${prosePromptBlock}\n${promptSectionsSource.slice(proseCraftSnippetStart, proseCraftSnippetEnd)}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetEnd).toBeGreaterThan(proseCraftSnippetStart)
    expect(proseCraftPromptSource).toContain('小节内部结构')
    expect(proseCraftPromptSource).toContain('一个主事件')
    expect(proseCraftPromptSource).toContain('3-5 个子事件')
    expect(proseCraftPromptSource).toContain('一个情绪变化')
    expect(proseCraftPromptSource).toContain('一条读者新获知的信息')
    expect(proseCraftPromptSource).toContain('3-5 轮对话交锋')
    expect(proseCraftPromptSource).toContain('小节结尾留一个钩子')
    expect(proseCraftPromptSource).toContain('下一节开头快速接续')
    expect(proseCraftPromptSource).toContain('情绪跨节递进')
    expect(proseCraftPromptSource).toContain('小节密度诊断')
    expect(proseCraftPromptSource).toContain('偏短不得加环境描写')
    expect(proseCraftPromptSource).toContain('子事件三维度')
    expect(proseCraftPromptSource).toContain('对话交锋')
    expect(proseCraftPromptSource).toContain('简短回忆')
    expect(reviewPrompt).toContain('小节密度诊断检查')
    expect(reviewPrompt).toContain('小节内部结构')
    expect(reviewPrompt).toContain('下一节开头快速接续')
    expect(reviewPrompt).toContain('情绪跨节递进')
    expect(reviewPrompt).toContain('为凑字数加环境描写')
    expect(reviewPrompt).toContain('无意义动作')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(revisionPrompt).toContain('小节密度诊断')
    expect(revisionPrompt).toContain('小节结构')
    expect(revisionPrompt).toContain('主事件 + 3-5 个子事件')
    expect(revisionPrompt).toContain('下一节开头快速接续')
    expect(revisionPrompt).toContain('补感官细节、身体动作、对话交锋或2-3句简短回忆')
    expect(revisionPrompt).toContain('不得用环境描写、重复情绪或内心独白凑字数')
  })

  test('asks prose generation self review and revision to enforce oh-story event content ratio', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const promptSectionsSource = readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const qualityAuditPromptStart = promptSectionsSource.indexOf('export function buildQualityAuditPromptSection')
    const prosePromptSource = `${prosePromptBlock}\n${promptSectionsSource.slice(qualityAuditPromptStart)}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(qualityAuditPromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptSource).toContain('事件内容比重不能小于一半')
    expect(prosePromptSource).toContain('事件是价值改变的契机')
    expect(prosePromptSource).toContain('设定尽量通过事件演绎')
    expect(reviewPrompt).toContain('事件内容比重')
    expect(reviewPrompt).toContain('设定尽量通过事件演绎')
    expect(reviewPrompt).toContain('quality_audit_checks')
    expect(revisionPrompt).toContain('事件内容比重')
    expect(revisionPrompt).toContain('旁白强塞')
    expect(revisionPrompt).toContain('动作、选择、阻碍、代价或局势变化')
  })

  test('asks prose self review and revision to enforce scene-card density execution', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('scene_cards.density_level')
    expect(reviewPrompt).toContain('疏密分配')
    expect(reviewPrompt).toContain('dense 的爽点/打脸/反转/情绪高潮')
    expect(reviewPrompt).toContain('sparse 的过场/赶路/信息交代/时间跳转')
    expect(reviewPrompt).toContain('medium 的铺垫/日常/关系升温')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(reviewPrompt).toContain('density_level 执行')
    expect(revisionPrompt).toContain('scene_cards.density_level')
    expect(revisionPrompt).toContain('疏密分配')
    expect(revisionPrompt).toContain('density_level 执行偏差')
    expect(revisionPrompt).toContain('revision_receipts')
  })

  test('asks prose self review and revision to enforce scene-card sensory anchors', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('scene_cards.sensory_anchor')
    expect(reviewPrompt).toContain('感知素材库')
    expect(reviewPrompt).toContain('感知是主角主动注意到的细节')
    expect(reviewPrompt).toContain('装饰性场景描写')
    expect(revisionPrompt).toContain('scene_cards.sensory_anchor')
    expect(revisionPrompt).toContain('感知锚点执行偏差')
    expect(revisionPrompt).toContain('主角主动注意到')
  })

  test('asks prose generation self review and revision to enforce scene-card serial risk repairs', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )
    const structuredFieldsSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/structured-review-fields.ts'), 'utf8')
    const reviewFieldList = structuredFieldsSource.slice(
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_CHECK_FIELDS'),
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_REQUIRED_FIELDS'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('scene_cards.serial_risk_repairs')
    expect(prosePromptBlock).toContain('scene_cards.recent_fatigue_action')
    expect(prosePromptBlock).toContain('风险修复动作')
    expect(prosePromptBlock).toContain('目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却')
    expect(reviewPrompt).toContain('scene_cards.serial_risk_repairs')
    expect(reviewPrompt).toContain('recent_fatigue_action')
    expect(reviewPrompt).toContain('serial_risk_repair_checks')
    expect(reviewPrompt).toContain('可见事件')
    expect(revisionPrompt).toContain('scene_cards.serial_risk_repairs')
    expect(revisionPrompt).toContain('serial_risk_repair_checks')
    expect(revisionPrompt).toContain('风险修复动作')
    expect(reviewFieldList).toContain("['serial_risk_repair_checks', 'serialRiskRepairChecks']")
  })

  test('asks prose generation to output per-scene scene-card execution receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('scene_card_receipts')
    expect(prosePromptBlock).toContain('goal_obstacle_change_delivered')
    expect(prosePromptBlock).toContain('purpose_tag_delivered')
    expect(prosePromptBlock).toContain('density_level_delivered')
    expect(prosePromptBlock).toContain('sensory_anchor_delivered')
    expect(prosePromptBlock).toContain('serial_risk_repairs_delivered')
    expect(prosePromptBlock).toContain('dialogue_goals_delivered')
    expect(prosePromptBlock).toContain('style_directives_delivered')
    expect(prosePromptBlock).toContain('benchmark_recall_directives_delivered')
    expect(prosePromptBlock).toContain('concept_anchor_rules_delivered')
    expect(prosePromptBlock).toContain('prose_craft_directives_delivered')
    expect(prosePromptBlock).toContain('evidence(array)')
    expect(prosePromptBlock).toContain('scene_start_anchor')
    expect(prosePromptBlock).toContain('scene_end_anchor')
    expect(prosePromptBlock).toContain('不能只写“已完成”')
  })

  test('asks prose generation to output top-level oh-story delivery receipts for storage', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('oh_story_delivery_receipts')
    expect(prosePromptBlock).toContain('chapter_blueprint')
    expect(prosePromptBlock).toContain('scene_card_receipts')
    expect(prosePromptBlock).toContain('delivery_risk_receipts')
    expect(prosePromptBlock).toContain('revision_receipts')
    expect(prosePromptBlock).toContain('artifact_protocol_receipts')
    expect(prosePromptBlock).toContain('设定/关系.md')
    expect(prosePromptBlock).toContain('大纲/细纲_第XXX章.md')
    expect(prosePromptBlock).toContain('追踪/角色状态.md')
    expect(prosePromptBlock).toContain('changed_evidence 必须引用 chapter_text')
  })

  test('asks prose self review and revision to enforce artifact protocol receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('artifact_protocol_receipts')
    expect(reviewPrompt).toContain('artifact_path')
    expect(reviewPrompt).toContain('required_fields')
    expect(reviewPrompt).toContain('设定/题材定位.md')
    expect(revisionPrompt).toContain('artifact_protocol_receipts')
    expect(revisionPrompt).toContain('设定/关系.md')
    expect(revisionPrompt).toContain('追踪/时间线.md')
  })

  test('asks prose self review and revision to verify scene-card execution receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('scene_card_receipts')
    expect(reviewPrompt).toContain('goal_obstacle_change_delivered')
    expect(reviewPrompt).toContain('concept_anchor_rules_delivered')
    expect(reviewPrompt).toContain('prose_craft_directives_delivered')
    expect(reviewPrompt).toContain('不能信任回执自述')
    expect(reviewPrompt).toContain('正文证据')
    expect(revisionPrompt).toContain('scene_card_receipts')
    expect(revisionPrompt).toContain('scene_start_anchor')
    expect(revisionPrompt).toContain('scene_end_anchor')
    expect(revisionPrompt).toContain('修订后必须重写')
    expect(revisionPrompt).toContain('delivered=false')
  })

  test('asks prose self review and revision to enforce oh-story quality audit checks', () => {
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
    const reviewPreparationBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('const normalizedReview = {', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityQualityAuditRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.quality_audit_contract')
    expect(reviewPrompt).toContain('quality_audit_checks')
    expect(reviewPrompt).toContain('五维评分标准')
    expect(reviewPrompt).toContain('five_dimension_scores')
    expect(reviewPrompt).toContain('水文检测')
    expect(reviewPrompt).toContain('卖点表达')
    expect(reviewPrompt).toContain('发现比告知爽十倍')
    expect(reviewPrompt).toContain('开头暗示')
    expect(reviewPrompt).toContain('中间深化')
    expect(reviewPrompt).toContain('高潮爆发')
    expect(reviewPrompt).toContain('phase_checklist')
    expect(reviewPrompt).toContain('按阶段质量清单逐项覆盖对应 receipt_keys')
    expect(revisionPrompt).toContain('quality_audit_checks')
    expect(revisionPrompt).toContain('质量诊断')
    expect(revisionPrompt).toContain('卖点表达')
    expect(revisionPrompt).toContain('隐性展示')
    expect(revisionPrompt).toContain('开头暗示')
    expect(revisionPrompt).toContain('中间深化')
    expect(revisionPrompt).toContain('高潮爆发')
    expect(revisionPrompt).toContain('quality_audit_repair_receipts')
    expect(revisionPrompt).toContain('逐条对应 quality_audit_checks 中 status=fail/warn 的诊断项')
    expect(revisionPrompt).toContain('check_key, label, original_evidence, applied_fix, changed_evidence, remaining_risk')
    expect(shouldReviseBlock).toContain('quality_audit_checks')
    expect(reviewNormalizeBlock).toContain('quality_audit_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.quality_audit_checks')
    expect(reviewNormalizeBlock).toContain('five_dimension_scores: normalizeFiveDimensionQualityScores')
    expect(reviewPreparationBlock).toContain('const deterministicNewConceptChecks = scanNewConceptOverloadRisks(contextPackage)')
    expect(reviewPreparationBlock).toContain('const deterministicScaleAnchorChecks = scanEconomicPowerScaleAnchorRisks(chapterText)')
    expect(reviewNormalizeBlock).toContain('...deterministicNewConceptChecks')
    expect(reviewNormalizeBlock).toContain('...deterministicScaleAnchorChecks')
    expect(riskCarryOverBlock).toContain('quality_audit_checks')
    expect(riskCarryOverBlock).toContain('质量诊断')
  })

  test('asks prose self review and revision to enforce oh-story punctuation tone checks', () => {
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
    const riskSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/prose-quality-risks.ts'), 'utf8')
    const riskStart = riskSource.indexOf('export function proseQualityPunctuationToneRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.punctuation_tone_contract')
    expect(reviewPrompt).toContain('punctuation_tone_checks')
    expect(reviewPrompt).toContain('通篇句号化')
    expect(reviewPrompt).toContain('随机标点堆砌')
    expect(revisionPrompt).toContain('punctuation_tone_checks')
    expect(revisionPrompt).toContain('语气标点')
    expect(shouldReviseBlock).toContain('punctuation_tone_checks')
    expect(reviewNormalizeBlock).toContain('punctuation_tone_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.punctuation_tone_checks')
    expect(riskCarryOverBlock).toContain('punctuation_tone_checks')
    expect(riskCarryOverBlock).toContain('语气标点')
  })

  test('asks prose generation self review and revision to enforce oh-story punctuation function beats', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('被打断 / 拖长音')
    expect(prosePromptBlock).toContain('动作打断、换行、短句或未完成动作')
    expect(prosePromptBlock).toContain('信息揭示 / 判断落点')
    expect(prosePromptBlock).toContain('冒号或短句制造落点')
    expect(prosePromptBlock).toContain('不写论文式长分号链')
    expect(reviewPrompt).toContain('被打断 / 拖长音')
    expect(reviewPrompt).toContain('信息揭示 / 判断落点')
    expect(reviewPrompt).toContain('论文式长分号链')
    expect(revisionPrompt).toContain('动作打断、换行或短句')
    expect(revisionPrompt).toContain('冒号或短句制造信息揭示落点')
  })

  test('keeps prose revision receipts for post-revision quality audit', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const revisionParseBlock = source.slice(
      source.indexOf('const revisionPayload = getNovelPayload(revisionResult)'),
      source.indexOf('const runCommercialEditorRewrite', source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')),
    )

    expect(revisionPrompt).toContain('字数对比')
    expect(revisionPrompt).toContain('30%')
    expect(revisionPrompt).toContain('800 字')
    expect(revisionPrompt).toContain('revision_scope_guard')
    expect(revisionParseBlock).toContain('revisionPayload?.proseChapters')
    expect(revisionParseBlock).toContain('revisedFirst?.chapterText')
    expect(revisionParseBlock).toContain('revisionPayload?.chapterText')
    expect(revisionParseBlock).toContain('revisedFirst?.sceneBreakdown')
    expect(revisionParseBlock).toContain('revisionPayload?.sceneBreakdown')
    expect(revisionParseBlock).toContain('revisedFirst?.continuityNotes')
    expect(revisionParseBlock).toContain('revisionPayload?.continuityNotes')
    expect(revisionParseBlock).toContain('revision_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.revision_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.revisionReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.revision_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.revisionReceipts')
    expect(revisionParseBlock).toContain('deslop_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.deslop_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.deslopRepairReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.deslop_repair_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.deslopRepairReceipts')
    expect(revisionParseBlock).toContain('quality_audit_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.quality_audit_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.qualityAuditRepairReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.quality_audit_repair_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.qualityAuditRepairReceipts')
    expect(revisionParseBlock).toContain('revision_scope_guard')
  })

  test('keeps nested oh-story revision receipts for post-revision quality audit', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionStart = source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')
    const revisionParseBlock = source.slice(
      revisionStart,
      source.indexOf('oh_story_delivery_receipts: revisionDeliveryReceipts', revisionStart) + 'oh_story_delivery_receipts: revisionDeliveryReceipts'.length + 80,
    )

    expect(revisionParseBlock).toContain('revisedFirst?.oh_story_delivery_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.ohStoryDeliveryReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.oh_story_delivery_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.ohStoryDeliveryReceipts')
    expect(revisionParseBlock).toContain('oh_story_delivery_receipts: revisionDeliveryReceipts')
  })

  test('normalizes oh-story findings without dropping evidence or fix fields', () => {
    const issue = normalizeIssue({
      severity: 'S2',
      category: 'prose',
      location: '第3段',
      evidence: '眼神复杂',
      issue: '抽象心理和AI高频套话',
      fix: '改成具体动作和对白反应',
    })

    expect(issue.severity).toBe('S2')
    expect(issue.type).toBe('prose')
    expect(issue.category).toBe('prose')
    expect(issue.location).toBe('第3段')
    expect(issue.evidence).toBe('眼神复杂')
    expect(issue.description).toBe('抽象心理和AI高频套话')
    expect(issue.fix).toBe('改成具体动作和对白反应')
    expect(issue.suggestion).toBe('改成具体动作和对白反应')
  })

  test('normalizes camelCase review control fields from model output', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewNormalizeStart = source.indexOf('const rawReviewIssues = [')
    const reviewNormalizeBlock = source.slice(
      reviewNormalizeStart,
      source.indexOf('if (options.revise === false || !shouldReviseProse', reviewNormalizeStart),
    )

    expect(reviewNormalizeStart).toBeGreaterThan(-1)
    expect(reviewNormalizeBlock).toContain('reviewPayload?.needsRevision')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.revisionDirectives')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.focusedRevisionModes')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.settingViolations')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.craftMetrics')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.findings')
    expect(reviewNormalizeBlock).toContain('...asArray(reviewPayload?.issues)')
    expect(reviewNormalizeBlock).toContain('...asArray(reviewPayload?.findings)')
  })

  const buildUsableV2NextChapterQualityPlan = () => ({
    version: 'oh_story_next_chapter_quality_plan_v1',
    quality_focus: ['下一章继续压住当前冲突。'],
    opening_actions: ['前300字原地承接本章章末动作。'],
    middle_actions: ['中段兑现一次规则反制。'],
    ending_actions: ['章末留下可追读的新问题。'],
    avoid_repetition: ['不要重复解释本章规则。'],
    evidence_basis: ['本章已经写出当前冲突的可定位证据。'],
  })

  test('v2 final decision blocks a structured quality failure even when the v2 score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            status: 'fail',
            label: '细纲兑现未闭环',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'structured_quality_gate', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision blocks a structured carry-over claim that only provides a fix', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            status: 'fail',
            label: '细纲兑现未闭环',
            fix: '下一章写入追踪文档。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'structured_quality_gate', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision allows a structured carry-over with locatable prose evidence', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            status: 'fail',
            label: '细纲兑现未闭环',
            evidence: '门槛白线后退半步，当前冲突已经在正文中落地。',
            fix: '下一章写入追踪文档。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.approvable).toBe(true)
    expect(decision.hard_failures).toEqual([])
  })

  test('v2 final decision blocks an undelivered current-chapter delivery risk', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        delivery_risk_receipts: [
          {
            risk_item: '当前冲突兑现',
            delivered: false,
            evidence: '',
            remaining_risk: '正文未兑现当前冲突。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'delivery_risk_receipt', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision allows a locatable delivery receipt with only next-chapter carry-over', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        delivery_risk_receipts: [
          {
            risk_item: '下一章冲突强化',
            delivered: false,
            evidence: '门槛白线后退半步，玻璃门内外的当前冲突已经落成正文。',
            remaining_risk: '下一章继续强化冲突并写回状态。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.approvable).toBe(true)
    expect(decision.hard_failures).toEqual([])
  })

  test('v2 final decision blocks a missing next-chapter quality plan', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'next_chapter_quality_plan', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision is not approvable when an original v2 hard failure remains', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: false,
            approvable: true,
            score: 92,
            hard_failures: [
              {
                key: 'non_chinese_leak',
                message: '正文出现连续英文段落',
                source: 'deterministic',
              },
            ],
            advisory_failures: [],
          },
        },
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toHaveLength(1)
  })

  test('v2 final decision preserves and deduplicates v2 hard failures while adding safety', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: false,
            approvable: true,
            score: 92,
            hard_failures: [
              {
                key: 'non_chinese_leak',
                message: '正文出现连续英文段落',
                source: 'deterministic',
                evidence: 'Chapter summary leaked into the prose.',
                severity: 'S1',
              },
              { key: 'non_chinese_leak', message: '正文出现连续英文段落', source: 'deterministic' },
            ],
            advisory_failures: ['节奏仍可继续收紧'],
          },
        },
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
      {
        blocked: true,
        reasons: ['命中禁止仿写表达'],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures.filter((item: any) => item.key === 'non_chinese_leak')).toHaveLength(1)
    expect(decision.hard_failures.find((item: any) => item.key === 'non_chinese_leak')).toMatchObject({
      evidence: 'Chapter summary leaked into the prose.',
      severity: 'S1',
    })
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'reference_safety', source: 'deterministic' }),
    ]))
    expect(decision.reasons).toEqual(expect.arrayContaining([
      '正文出现连续英文段落',
      '仿写安全未通过：命中禁止仿写表达',
      '节奏仍可继续收紧',
    ]))
  })

  test('blocks quality gate when oh-story contract checks fail even if the score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        score: 88,
        issues: [],
        quality_audit_checks: [
          {
            key: 'missing_quality_audit_checks',
            label: '缺少质量诊断自检',
            status: 'fail',
            evidence: 'chapter_target.quality_audit_contract 存在，但模型没有输出 quality_audit_checks。',
            fix: '补充 quality_audit_checks。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('质量诊断自检')
  })

  test('summarizes anonymous structured gate failures without leaking prose excerpts', () => {
    const proseExcerpt = '江哲却注意到，老陈说出“诡序天平”四个字时，所有追索者的枪口同时向下沉了半寸。不是害怕，是训练出来的避让。'
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 88,
        issues: [],
        next_chapter_quality_plan: {
          quality_focus: ['继续压住公开诱捕压力。'],
          opening_actions: ['用镇门封锁承接。'],
          middle_actions: ['让规则复核升级。'],
          ending_actions: ['章末留下镇门诱捕。'],
          avoid_repetition: ['不重复解释天平规则。'],
          evidence_basis: ['本章已经写出诡序天平反制。'],
        },
        quality_audit_checks: [
          {
            status: 'fail',
            evidence: proseExcerpt,
            fix: '补成可复核的质量诊断回执。',
          },
        ],
      },
    )

    const reasonText = decision.reasons.join('｜')
    expect(decision.passed).toBe(false)
    expect(reasonText).toContain('质量诊断')
    expect(reasonText).not.toContain('江哲却注意到')
  })

  test('blocks quality gate when prose revision receipts are missing after revision', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        revision_receipt_checks: [
          {
            key: 'missing_revision_receipts',
            label: '修订回执未生成',
            status: 'fail',
            evidence: '自检要求修复承接风险，但修订结果没有逐条 revision_receipts。',
            fix: '重新修订并逐条输出 revision_receipts.changed_evidence。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('修订回执未生成')
  })

  test('blocks quality gate when deslop repair receipts still have residual risks', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate F 章末总结体仍残留。',
            fix: '重新修订并给出 deslop_repair_receipts.changed_evidence。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('去AI味修复回执未闭环')
  })

  test('does not block quality gate on post-repair sync carry-over when prose score and hard issues pass', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 85,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续兑现镇门诱捕。'],
          opening_actions: ['从江哲踏上石板路后的第一步写起。'],
          middle_actions: ['让镇门筛口触发一次真实代价。'],
          ending_actions: ['露出陆长风遗留物的一角。'],
          avoid_repetition: ['不要重复一次天平复核。'],
          evidence_basis: ['本章结尾已经完成镇门邀请和捕兽夹钩子。'],
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            sync_key: 'chapter_blueprint_sync',
            label: '细纲兑现未闭环',
            status: 'fail',
            evidence: '章节蓝图同步：仍有 2 项需要写回追踪。',
            fix: '后续同步章节蓝图和追踪文档。',
            missed_count: 2,
          },
          {
            key: 'quality_audit_repair_receipt_sync',
            label: '质量诊断修复回执未闭环',
            status: 'fail',
            evidence: '质量诊断修复回执残留 3：需要下一轮继续处理。',
            fix: '下一轮优先处理剩余质量诊断回执。',
            missed_count: 3,
          },
          {
            key: 'revision_cascade_impact_evidence',
            label: '修订级联影响证据未闭环',
            status: 'fail',
            evidence: '资产状态需同步到后续章节。',
            fix: '写入状态追踪，不影响本章正文入库。',
          },
        ],
        revision_receipt_checks: [
          {
            key: 'prose_revision_receipt_sync',
            label: '修订回执未闭环',
            status: 'fail',
            evidence: '修订回执残留 5：需要下一章或同步任务继续处理。',
            fix: '下一章继续处理回执残留。',
            missed_count: 5,
          },
        ],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: '去AI味修复回执残留 2：仍有轻度模板风险需下轮继续压。',
            fix: '下一轮继续压去AI味残留。',
            missed_count: 2,
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('结构化自检失败')
  })

  test('does not block quality gate on benchmark recall sync and Gate B carry-over after successful repair', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 86,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章进入镇门内部，减少同类颜色词重复。'],
          opening_actions: ['前300字从镇门门槛和老陈伤势承接。'],
          middle_actions: ['中段让封锁令权限和秩序核心代价继续压迫主角。'],
          ending_actions: ['章末露出陆长风线索的下一层钩子。'],
          avoid_repetition: ['不要重复废墟封锁和天平复核。'],
          evidence_basis: ['本章已经写出镇门邀请、秩序核心耗损和陆长风线索钩子。'],
        },
        benchmark_recall_checks: [
          {
            key: 'benchmark_recall_sync',
            label: '文风召回未闭环',
            status: 'fail',
            evidence: '文风召回同步：本章已按三轮压问推进，剩余节奏差异写入下一章继续处理。',
            fix: '下一章继续把对标节奏转成镇门内部的压迫、爆发、冷却和反应。',
            missed_count: 1,
          },
        ],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate B 句式套路与主语节奏：多人对峙场景仍需保持主语清晰，不能过度省略。',
            fix: '下一章多人对峙仍需继续用物件和动作承接。',
            missed_count: 1,
          },
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate B 句式套路与主语节奏：多人对峙场景仍需清晰点名，未完全消除人名起句。',
            fix: '下一轮继续压去AI味残留，但不重写整章。',
            missed_count: 1,
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('文风召回未闭环')
    expect(decision.reasons.join('｜')).not.toContain('去AI味修复回执未闭环')
  })

  test('does not block quality gate on repaired receipt evidence-location misses and state carry-over', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 85,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续压住镇门内部识别机制和左手代价。'],
          opening_actions: ['前300字从镇门封锁和老陈伤势承接。'],
          middle_actions: ['中段让第二枚秩序核心来源进入可见代价。'],
          ending_actions: ['章末留下诡序之主资产状态的下一层钩子。'],
          avoid_repetition: ['不要重复雾、复眼、符文同组意象。'],
          evidence_basis: ['本章已经写出镇门邀请、秩序核心耗损和规则反制。'],
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            sync_key: 'chapter_blueprint_sync',
            label: '细纲兑现未闭环',
            status: 'fail',
            evidence: '章节蓝图同步：当前正文部分目标未充分落地，但第二枚秩序核心来源需后续同步写回。',
            fix: '下一章继续解释镇门内部识别机制，但不能一次性讲完。',
            missed_count: 1,
          },
          {
            key: 'pre_store_structural_sync',
            sync_key: 'benchmark_recall_sync',
            label: '文风召回未闭环',
            status: 'fail',
            evidence: '文风召回同步：当前正文部分节奏未充分落地；剩余节奏差异进入下一章继续处理。',
            fix: '后续继续压住压迫、爆发、冷却和反应。',
            missed_count: 1,
          },
          {
            key: 'quality_audit_repair_receipt_sync',
            label: '质量诊断修复回执未闭环',
            status: 'fail',
            evidence: 'changed_evidence 无法定位到修订后正文。',
            fix: '后续需延续左手代价。',
            remaining_risk: '镇门内部识别机制需下一章继续解释但不能一次性讲完。',
          },
          {
            key: 'revision_cascade_impact_evidence',
            label: '修订级联影响证据未闭环',
            status: 'fail',
            evidence: '第二枚秩序核心、暗金信件、江哲左掌代价需同步到后续追踪。',
            fix: '写入状态追踪，不影响本章正文入库。',
            remaining_risk: '资产状态写回义务。',
          },
        ],
        revision_receipt_checks: [
          {
            key: 'prose_revision_receipt_sync',
            label: '修订回执未闭环',
            status: 'fail',
            evidence: 'changed_evidence 无法定位到修订后正文。',
            fix: '诡序之主本体仍未直接出场，符合当前认知边界；下一章需从镇门前继续。',
            remaining_risk: '下一章继续承接敌方视觉体系。',
          },
        ],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate A changed_evidence 无法定位到修订后正文。',
            fix: '旧回执证据片段已被修订改写，后续继续避免模板表达。',
            remaining_risk: 'changed_evidence 无法定位到修订后正文。',
          },
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate G changed_evidence 无法定位到修订后正文。',
            fix: '旧回执证据片段已被修订改写，下一章继续避免章末总结体。',
            remaining_risk: 'changed_evidence 无法定位到修订后正文。',
          },
        ],
        delivery_risk_receipts: [
          {
            risk_item: '补资产状态：诡序之主',
            required_action: '补资产状态：诡序之主。',
            delivered: false,
            evidence: '诡序之主本体仍未直接出场，符合当前认知边界。',
            remaining_risk: '承接回执缺失：补资产状态：诡序之主。',
          },
          {
            risk_item: '补角色状态：江哲',
            required_action: '补角色状态：江哲左掌代价。',
            delivered: false,
            evidence: '江哲左掌代价已经进入下一章质量续航计划。',
            remaining_risk: '承接回执缺失：补角色状态：角色状态增量缺口 2｜修复：江哲：主角。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('结构化自检失败')
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('does not block quality gate on benchmark recall sync wording and quality-continuation delivery receipts', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 86,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章直接验证镇门内陆长风声音真假。'],
          opening_actions: ['前300字承接镇门声音和江哲即时选择。'],
          middle_actions: ['中段让镇门夹缝触发一次规则反制。'],
          ending_actions: ['章末留下陆长风真实状态碎片。'],
          avoid_repetition: ['不要重复封锁令宣读。'],
          evidence_basis: ['本章已经留下镇门内声音和核心裂痕代价。'],
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            sync_key: 'benchmark_recall_sync',
            label: '文风召回未闭环',
            status: 'fail',
            evidence: '召回缺口 1：正文有 1 项文风召回要求未充分落地。',
            fix: '下一次修订优先补足文风召回 missed 项；保留 gaps 中的缺口，不要把缺失的深度拆解、冲突来源或文风偏差误判为已经解决。',
            missed_count: 1,
          },
        ],
        delivery_risk_receipts: [
          {
            risk_item: '补追读：漏追读 7',
            required_action: '把反派长期目标转入下一章追读计划。',
            delivered: false,
            evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
            remaining_risk: '承接回执缺失：补追读：漏追读 7｜修复：诡序之主：通过不断降临怪谈副本，彻底蚕食蓝星人类的理智，将蓝星转化为怪谈世界的一部分，实现真身降临。',
          },
          {
            risk_item: '修吸引力：吸引力缺口 4',
            required_action: '把核心卖点转入下一章质量续航。',
            delivered: false,
            evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
            remaining_risk: '承接回执缺失：修吸引力：吸引力缺口 4｜修复：江哲：破解怪谈世界：我是超人，怪谈你随意的核心规则。',
          },
          {
            risk_item: '补循环：故事循环缺口 2',
            required_action: '把资产状态写回下一轮状态更新。',
            delivered: false,
            evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
            remaining_risk: '承接回执缺失：补循环：故事循环缺口 2｜修复：不要重写全设定表；只处理本章计划触达且正文实际改变的关键资产。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('文风召回未闭环')
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('blocks quality gate when deslop diagnostic gates fail even if the score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 88,
        issues: [],
        deslop_gate_diagnostics: {
          gates: [
            {
              gate: 'A',
              label: '禁用词/模板表达',
              status: 'fail',
              evidence: '那不是普通水迹，而是一种更深的规则。',
              fix: '直接写水迹倒流。',
            },
          ],
        },
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('禁用词/模板表达')
  })

  test('blocks quality gate when delivery risk receipts remain undelivered even if the score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续把门槛白线写成规则边界。'],
          opening_actions: ['前300字用门槛白线承接玻璃门对峙。'],
          middle_actions: ['中段让白线规则反制一次硬闯。'],
          ending_actions: ['章末用白线另一侧的新脚印形成追读。'],
          avoid_repetition: ['不要再用旁白总结“危机才刚开始”。'],
          evidence_basis: ['本章已把门槛白线写成新的规则边界。'],
        },
        delivery_risk_receipts: [
          {
            risk_item: 'IP场面延展：待延展 1',
            required_action: '延展玻璃门内外对峙的门槛白线强画面。',
            delivered: false,
            evidence: '',
            remaining_risk: '正文没有延展玻璃门内外对峙。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('承接回执未兑现')
    expect(decision.reasons.join('｜')).toContain('IP场面延展')
  })

  test('does not block quality gate when delivery risk receipts are delivered with no remaining risk', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续把门槛白线写成规则边界。'],
          opening_actions: ['前300字用门槛白线承接玻璃门对峙。'],
          middle_actions: ['中段让白线规则反制一次硬闯。'],
          ending_actions: ['章末用白线另一侧的新脚印形成追读。'],
          avoid_repetition: ['不要再用旁白总结“危机才刚开始”。'],
          evidence_basis: ['本章已把门槛白线写成新的规则边界。'],
        },
        delivery_risk_receipts: [
          {
            risk_item: 'IP场面延展：待延展 1',
            required_action: '延展玻璃门内外对峙的门槛白线强画面。',
            delivered: true,
            evidence: '门槛白线后退半步，玻璃门内外对峙被写成新的规则边界。',
            remaining_risk: '无',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('does not block quality gate for delivery risk receipts that only need post-delivery sync or next-chapter carry-over', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续压住镇门危局。'],
          opening_actions: ['前300字原地承接镇门倒计时。'],
          middle_actions: ['中段用资产代价换一次规则反制。'],
          ending_actions: ['章末留下镇门新权限钩子。'],
          avoid_repetition: ['不要重复解释镇门来历。'],
          evidence_basis: ['本章已经写出镇门封锁和资产消耗。'],
        },
        delivery_risk_receipts: [
          {
            risk_item: '资产挂钩',
            required_action: '让关键资产参与胜负。',
            delivered: false,
            evidence: '秩序残核白光与照胆鼎残影共同压住完美超人基因。',
            remaining_risk: '资产台账需同步。',
          },
          {
            risk_item: '伏笔追踪',
            required_action: '把新门名写入追踪。',
            delivered: false,
            evidence: '入门者，留名。',
            remaining_risk: '需更新追踪/伏笔.md。',
          },
          {
            risk_item: '回报密度',
            required_action: '保持阶段性物理爽点。',
            delivered: false,
            evidence: '复核前不得强夺随身物。',
            remaining_risk: '下一章需补更强物理爽点或规则反制。',
          },
          {
            risk_item: '状态跟踪',
            required_action: '中段跟踪江哲、老陈、敌方封锁状态。',
            delivered: false,
            evidence: '江哲黑符收紧且临时通行；老陈污染爬向喉咙；追索者被令牌约束但履带车跟随。',
            remaining_risk: 'delivery_risk_receipts middle_actions 的 evidence 未落在中段事件推进。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('persists a warning prose quality review when valid prose is admitted with advisory quality failures', async () => {
    const failedReview = (evidence: string) => ({
      score: 61,
      publishable: false,
      dimensions: { ...proseQualityScores, prose_style: 4 },
      findings: [{
        key: 'prose_style',
        severity: 'S2',
        dimension: 'prose_style',
        evidence,
        required_change: '减少模板化表达并保留具体动作',
        acceptance_test: '正文以动作和对白推进，不使用抽象总结',
      }],
    })
    const revisedText = buildPipelineProse(
      '江澈撞断路灯，追兵的包围线被飞石逼开。',
      '沿自己制造的缺口夺下通讯器并继续推进',
    )
    const harness = await createProsePipelineHarness({
      reviewPayloads: [
        failedReview('倒数压到最后三秒，江澈停在围墙阴影里等待。'),
        failedReview('江澈撞断路灯，追兵的包围线被飞石逼开。'),
      ],
      revisionTexts: [revisedText],
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      quality_threshold: 78,
    })
    const proseQualityReview = (await listNovelReviews(harness.workspace, harness.project.id))
      .filter(review => review.review_type === 'prose_quality')
      .at(-1)
    const payload = JSON.parse(String(proseQualityReview?.payload || '{}'))

    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'quality' }))
    expect(proseQualityReview?.status).toBe('warn')
    expect(payload.self_check?.review).toMatchObject({
      passed: false,
      score: 61,
      needs_revision: true,
    })
    expect(payload.self_check?.review?.issues?.length).toBeGreaterThan(0)
  })

  test('reports review stage status from quality gate decisions', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const reviewStart = source.indexOf("await onStage('review', { status: 'running' })")
    const qualityGateStart = source.indexOf('let qualityGateReview = buildQualityGateReviewWithDeterministicCleanup')
    const reviewBlock = source.slice(reviewStart, qualityGateStart)

    expect(reviewBlock).toContain('const initialReviewDecision = getQualityGateDecision(qualityGateProject')
    expect(reviewBlock).toContain("status: initialReviewDecision.passed ? 'success' : 'warn'")
    expect(reviewBlock).toContain("phase: round > 0 ? 'quality_recheck' : 'quality_review'")
    expect(reviewBlock).toContain("await onStage('revise', { status: 'running', phase: 'quality_revision', round })")
    expect(reviewBlock).toContain('maxRevisionRounds: isDraftReviewOnly || isDraftOnly ? 0 : 1')
    expect(reviewBlock).toContain('qualityWarningCandidates.push(')
    expect(reviewBlock).not.toContain('assertProseQualityCanStore')
  })

  test('formats structured review findings for stored issue summaries', () => {
    const summary = formatReviewIssueForStorage({
      severity: 'S2',
      category: 'prose',
      location: '第3段',
      evidence: '眼神复杂',
      issue: '抽象心理和AI高频套话',
      fix: '改成具体动作和对白反应',
    })

    expect(summary).toContain('S2')
    expect(summary).toContain('prose')
    expect(summary).toContain('第3段')
    expect(summary).toContain('抽象心理和AI高频套话')
    expect(summary).toContain('证据：眼神复杂')
    expect(summary).toContain('修法：改成具体动作和对白反应')
  })

  test('formats scene-card receipt findings with scene and field metadata for repair tasks', () => {
    const summary = formatReviewIssueForStorage({
      key: 'scene_card_receipt_2_undelivered',
      label: '场景卡回执证据复核',
      status: 'fail',
      scene_no: 2,
      fields: ['目标/阻碍/状态变化', '感知锚点'],
      evidence: '场景2《盟友改口》scene_card_receipts 标记未兑现。',
      fix: '按 delivered=false 的字段修正文，再重写 scene_card_receipts。',
    })

    expect(summary).toContain('fail')
    expect(summary).toContain('场景卡回执证据复核')
    expect(summary).toContain('场景2')
    expect(summary).toContain('目标/阻碍/状态变化、感知锚点')
    expect(summary).toContain('scene_card_receipt_2_undelivered')
    expect(summary).not.toContain('[object Object]')
  })

  test('exposes pre-draft brief routes for build, save, and confirm', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-chapter-context-routes.ts'), 'utf8')

    expect(source).toContain("app.get('/api/novel/chapters/:chapterId/pre-draft-brief'")
    expect(source).toContain("app.put('/api/novel/chapters/:chapterId/pre-draft-brief'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/pre-draft-brief/confirm'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/pre-draft-brief/style-samples'")
    expect(source).toContain('applyStyleSampleStrategyAuthorAction')
    expect(source).toContain('raw_payload.pre_draft_brief')
  })
})
