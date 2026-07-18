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

describe('chapter prose word target', () => {
  test('counts prose characters without whitespace for chapter target evaluation', () => {
    expect(countProseChars('李辰 醒来\n规则响起。')).toBe(9)
  })

  test('rejects a standard chapter draft below the minimum word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)

    expect(evaluation.passed).toBe(false)
    expect(evaluation.too_short).toBe(true)
    expect(evaluation.actual).toBe(1732)
    expect(evaluation.deficit).toBe(1468)
    expect(evaluation.min).toBe(3200)
    expect(evaluateProseWordTarget('字'.repeat(3200), target).passed).toBe(true)
  })

  test('rejects a standard chapter draft above the maximum word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(12389), target)

    expect(evaluation.passed).toBe(false)
    expect(evaluation.too_long).toBe(true)
    expect(evaluation.actual).toBe(12389)
    expect(evaluation.max).toBe(5200)
  })

  test('contracts over-target prose before returning the best complete candidate with a warning', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const ensureStart = source.indexOf('const ensureProseMeetsWordTarget =')
    const ensureEnd = source.indexOf('const autoRepairChapterPreflightGaps =', ensureStart)
    const ensureBlock = source.slice(ensureStart, ensureEnd)
    const tooLongStart = ensureBlock.indexOf('if (evaluation.too_long && options.contract !== false)')
    const contractionStart = ensureBlock.indexOf('const maxContractionAttempts', tooLongStart)
    const expansionStart = ensureBlock.indexOf('const maxExpansionAttempts')
    const contractionBlock = ensureBlock.slice(contractionStart, expansionStart)
    const softCapStart = ensureBlock.indexOf('applyProseWordTargetSoftCap(evaluateProseWordTarget(chapterText, wordTarget))')

    expect(ensureStart).toBeGreaterThanOrEqual(0)
    expect(ensureBlock.match(/applyProseWordTargetSoftCap\(evaluateProseWordTarget/g)).toHaveLength(3)
    expect(softCapStart).toBeLessThan(tooLongStart)
    expect(tooLongStart).toBeGreaterThanOrEqual(0)
    expect(contractionStart).toBeGreaterThan(tooLongStart)
    expect(expansionStart).toBeGreaterThan(contractionStart)
    expect(ensureBlock).toContain('options.maxContractionAttempts ?? options.max_contraction_attempts ?? 3')
    expect(ensureBlock).toContain('buildProseWordTargetContractionPrompt')
    expect(contractionBlock).toContain('maxTokens: proseContractionMaxTokensForAttempt(wordTarget, globalAttempt)')
    expect(contractionBlock).toContain('const finishReason = normalizeProseContractionFinishReason(contractionResult)')
    expect(contractionBlock).toContain('finish_reason: finishReason')
    expect(contractionBlock).toContain('model_usage: sanitizeWordTargetUsage((contractionResult as any).usage)')
    expect(contractionBlock).toContain('candidate_rejected: candidateRejected')
    expect(ensureBlock).toContain('!finalEvaluation.too_short')
    expect(ensureBlock).toContain('final_text: bestCompleteText')
    expect(ensureBlock).toContain('word_target_warning: buildWordTargetWarning(bestCompleteEvaluation)')
    expect(ensureBlock).toContain('contraction_attempts')
  })

  test('preserves runtime camelCase chapterTarget when applying chapter word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'long' })
    const context = applyChapterWordTargetToContext({
      chapterTarget: {
        chapterNo: 8,
        title: '旧证追问',
        readerRetentionBrief: {
          openingHook: '开篇先让会长私印差点被烧掉。',
        },
        sceneCards: [
          { title: '私印抢夺', readerPayoff: '李玄保住旧证缺页。' },
        ],
      },
    }, target)

    expect(context.chapter_target.chapterNo).toBe(8)
    expect(context.chapter_target.readerRetentionBrief.openingHook).toContain('会长私印')
    expect(context.chapter_target.sceneCards[0].readerPayoff).toContain('旧证缺页')
    expect(context.chapter_target.word_target.target).toBe(10000)
    expect(context.chapterTarget.word_target.target).toBe(10000)
  })

  test('builds an expansion prompt with explicit word target guardrails', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)
    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          summary: '主角进入规则公寓。',
          conflict: '必须理解第一条规则。',
          ending_hook: '午夜广播响起。',
          word_target: target,
          scene_cards: [],
        },
      },
      '字'.repeat(1732),
      evaluation,
    )

    expect(prompt).toContain('当前正文约 1732 字')
    expect(prompt).toContain('目标 4200 字')
    expect(prompt).toContain('至少 3200 字')
    expect(prompt).toContain('不得删改已有效内容')
    expect(prompt).toContain('扩写动作过程、选择代价、对话交锋、章末钩子铺垫')
  })

  test('uses compact context snapshots for expansion prompts without leaking circular context', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)
    const contextPackage: any = {
      chapter_target: {
        chapter_no: 1,
        title: '循环上下文',
        word_target: target,
        scene_cards: [
          {
            title: '循环场景',
            purpose: `逼问广播来源；${'同步风险：delivery_risk_receipts 未闭环；'.repeat(20)}保留可写动作`,
          },
        ],
      },
    }
    contextPackage.self = contextPackage

    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '循环测试' },
      contextPackage,
      '字'.repeat(1732),
      evaluation,
    )

    expect(prompt).toContain('循环上下文')
    expect(prompt).toContain('循环场景')
    expect(prompt).toContain('保留可写动作')
    expect(prompt).not.toContain('[Circular]')
    expect(prompt).not.toContain('delivery_risk_receipts 未闭环')
  })

  test('requires word-target expansion to preserve scene anchors and execution receipts', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)
    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          word_target: target,
          scene_cards: [{ title: '规则广播', objective: '确认广播规则。' }],
        },
      },
      '字'.repeat(1732),
      evaluation,
    )

    expect(prompt).toContain('scene_breakdown 必须保留并更新 scene_start_anchor、scene_end_anchor 和 scene_card_receipts')
    expect(prompt).toContain('scene_card_receipts.evidence 必须引用扩写后对应场景证据')
    expect(prompt).toContain('不得借用其他场景')
  })

  test('asks word-target expansion to add functional prose instead of padding', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)
    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '审判庭旧账' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '旧账开封',
          word_target: target,
          scene_cards: [{ title: '账册翻页', purpose_tag: '关键揭露', density_level: 'dense' }],
        },
      },
      '字'.repeat(1732),
      evaluation,
    )

    expect(prompt).toContain('oh-story 扩写守恒')
    expect(prompt).toContain('不得用环境描写、重复情绪或内心独白凑字数')
    expect(prompt).toContain('补感官细节、身体动作、对话交锋、阻碍/反应/发现/递进')
    expect(prompt).toContain('每段只补 1-2 个有功能细节')
    expect(prompt).toContain('不新增支线、设定、关系或时间线')
  })

  test('asks word-target expansion to patch blueprint beats before prose when below ninety percent', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)
    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '审判庭旧账' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '旧账开封',
          word_target: target,
          chapter_blueprint: {
            beat_sequence: [
              { beat_no: 1, scene_no: 1, action: '主角发现账册缺页', function_tag: '关键揭露', payoff: '旧账可反证' },
              { beat_no: 2, scene_no: 1, action: '执事带人赶到', function_tag: '打脸', payoff: '公开压迫主角' },
            ],
          },
        },
      },
      '字'.repeat(1732),
      evaluation,
    )

    expect(prompt).toContain('oh-story 90% 字数门禁')
    expect(prompt).toContain('先回到 chapter_blueprint 补充更多子事件/情节点')
    expect(prompt).toContain('expansion_blueprint_patch')
    expect(prompt).toContain('added_beats')
    expect(prompt).toContain('expanded_beats')
    expect(prompt).toContain('过渡点保持带过')
    expect(prompt).toContain('爽点/卖点优先保扩')
  })

  test('reads runtime camelCase chapterTarget word target when building expansion prompts', () => {
    const runtimeTarget = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })
    const evaluation = evaluateProseWordTarget('字'.repeat(3600), runtimeTarget)
    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧标题',
        },
        chapterTarget: {
          chapterNo: 8,
          title: '会长私印',
          wordTarget: runtimeTarget,
        },
      },
      '字'.repeat(3600),
      evaluation,
    )

    expect(prompt).toContain('目标章节：第8章《会长私印》')
    expect(prompt).toContain('目标 5200 字')
    expect(prompt).toContain('至少 4680 字')
  })

  test('builds follow-up completion prompts from the remaining deficit', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 2 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(2554), target)
    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '超人的规则怪谈世界' },
      { chapter_target: { chapter_no: 2, title: '守则初读', word_target: target, scene_cards: [] } },
      '字'.repeat(2554),
      evaluation,
      { attempt: 2, maxAttempts: 3 },
    )

    expect(prompt).toContain('第 2 轮补写')
    expect(prompt).toContain('仍缺至少 646 字')
    expect(prompt).toContain('本轮必须优先补足缺口')
    expect(prompt).toContain('返回扩写后的完整正文')
  })

  test('extracts expanded prose from raw fenced model content', () => {
    const extracted = extractProseExpansionPayload({
      content: '```json\n{"prose_chapters":[{"chapter_text":"扩写后的正文","scene_breakdown":[{"scene_no":1}],"continuity_notes":["保留钩子"]}]}\n```',
    })

    expect(extracted.text).toBe('扩写后的正文')
    expect(extracted.scene_breakdown).toHaveLength(1)
    expect(extracted.continuity_notes).toEqual(['保留钩子'])
  })

  test('extracts expanded prose from camelCase model content', () => {
    const extracted = extractProseExpansionPayload({
      content: '```json\n{"proseChapters":[{"chapterText":"扩写后的正文","sceneBreakdown":[{"sceneNo":1}],"continuityNotes":["保留钩子"]}]}\n```',
    })

    expect(extracted.text).toBe('扩写后的正文')
    expect(extracted.scene_breakdown).toHaveLength(1)
    expect(extracted.continuity_notes).toEqual(['保留钩子'])
  })

  test('extracts blueprint expansion patch receipts from word-target expansion payloads', () => {
    const extracted = extractProseExpansionPayload({
      content: JSON.stringify({
        prose_chapters: [{
          chapter_text: '扩写后的正文',
          expansion_blueprint_patch: {
            added_beats: [{ beat_no: 3, function_tag: '爽点', action: '主角亮出第二本账册' }],
            expanded_beats: [{ beat_no: 1, added_sub_events: ['账册缺页先引出质疑'] }],
            compressed_beats: [{ beat_no: 2, reason: '赶路过渡带过' }],
          },
        }],
      }),
    })

    expect(extracted.expansion_blueprint_patch.added_beats[0].function_tag).toBe('爽点')
    expect(extracted.expansion_blueprint_patch.expanded_beats[0].added_sub_events[0]).toContain('账册缺页')
    expect(extracted.expansion_blueprint_patch.compressed_beats[0].reason).toContain('带过')
  })

  test('recovers plain prose when a draft model ignores the JSON envelope', () => {
    const prose = '刺耳的铃声炸开。李超猛地睁眼，发现宿舍门外的影子贴着地面游动。'.repeat(20)

    expect(extractPlainProseFallback({ content: prose }, 120)).toBe(prose)
    expect(extractPlainProseFallback({ content: `{"chapter_text":"${prose}"}` }, 120)).toBe('')
  })

  test('summarizes LLM result diagnostics for empty-content failures', () => {
    const diagnostics = buildLLMResultDiagnostics({
      content: '',
      finish_reason: 'completed',
      usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
      raw: {
        stream_chunks_tail: [
          { type: 'response.completed', response: { status: 'completed', output: [{ type: 'reasoning', summary: [] }] } },
        ],
      },
    })

    expect(diagnostics.finish_reason).toBe('completed')
    expect(diagnostics.usage.output_tokens).toBe(20)
    expect(diagnostics.raw_keys).toContain('stream_chunks_tail')
    expect(diagnostics.stream_tail.length).toBe(1)
  })

  test('recovers prose payload from Anthropic content blocks when normalized content is empty', () => {
    const chapterText = '丁松言睁开眼的时候，脑子里正在响一个不属于他的声音。'.repeat(20)
    const payload = getNovelPayload({
      content: '',
      raw: {
        content: [
          {
            type: 'text',
            text: `\`\`\`json\n{"prose_chapters":[{"chapter_no":1,"title":"异象初临","chapter_text":"${chapterText}","scene_breakdown":[{"scene_no":1}],"continuity_notes":["保留异象钩子"]}]}\n\`\`\``,
          },
        ],
        stop_reason: 'end_turn',
      },
    })

    expect(payload.prose_chapters?.[0]?.chapter_text).toBe(chapterText)
    expect(payload.prose_chapters?.[0]?.scene_breakdown).toHaveLength(1)
  })

  test('skips text-block output wrappers before recovering the prose payload', () => {
    const chapterText = '祠堂废墟里，半透明的兽影与梁柱重叠。'.repeat(20)
    const payload = getNovelPayload({
      output: {
        type: 'text',
        text: `\`\`\`json\n{"prose_chapters":[{"chapter_no":1,"title":"异象初临","chapter_text":"${chapterText}"}]}\n\`\`\``,
      },
      content: '',
    })

    expect(payload.prose_chapters?.[0]?.chapter_text).toBe(chapterText)
  })

  test('recovers prose payload from escaped fenced JSON content', () => {
    const chapterText = '丁松言握着手心里的残骨，沿着祠堂后院废墟往前走。'.repeat(20)
    const payload = getNovelPayload({
      content: `\`\`\`json\n{\\"prose_chapters\\":[{\\"chapter_no\\":2,\\"title\\":\\"灭门阴影\\",\\"chapter_text\\":\\"${chapterText}\\",\\"scene_breakdown\\":[{\\"scene_no\\":1}],\\"continuity_notes\\":[\\"承接第一章\\"]}]}\n\`\`\``,
      finish_reason: 'end_turn',
    })

    expect(payload.prose_chapters?.[0]?.chapter_no).toBe(2)
    expect(payload.prose_chapters?.[0]?.chapter_text).toBe(chapterText)
    expect(payload.prose_chapters?.[0]?.scene_breakdown).toHaveLength(1)
  })

  test('recovers closed chapter text from a max-token truncated prose JSON envelope', () => {
    const chapterText = '丁松言手心里的残骨开始发烫。不是物理上的温度，而是直接作用在意识深处的灼烧。'.repeat(90)
    const payload = getNovelPayload({
      content: `\`\`\`json\n{"prose_chapters":[{"chapter_no":3,"title":"残骨低语","chapter_text":"${chapterText}","scene_breakdown":[{"scene_no":1,"title":"血符迫近"}]`,
      finish_reason: 'max_tokens',
    })

    expect(payload.prose_chapters?.[0]?.chapter_no).toBe(3)
    expect(payload.prose_chapters?.[0]?.title).toBe('残骨低语')
    expect(payload.prose_chapters?.[0]?.chapter_text).toBe(chapterText)
    expect(payload.recovered_from_partial_json).toBe(true)
  })

  test('recovers open chapter text from a length-truncated prose JSON envelope', () => {
    const chapterText = '丁松言听见瓦片后面传来第二个人的呼吸。他没有回头，只把残骨压进掌心，逼着自己数清脚步。'.repeat(80)
    const payload = getNovelPayload({
      content: `{"prose_chapters":[{"chapter_no":4,"title":"瓦后呼吸","chapter_text":"${chapterText}`,
      finish_reason: 'length',
    })

    expect(payload.prose_chapters?.[0]?.chapter_no).toBe(4)
    expect(payload.prose_chapters?.[0]?.title).toBe('瓦后呼吸')
    expect(payload.prose_chapters?.[0]?.chapter_text).toBe(chapterText)
    expect(payload.recovered_from_partial_json).toBe(true)
    expect(payload.partial_json_open_string_recovered).toBe(true)
  })

  test('recovers closed chapter text with raw newlines inside fenced prose JSON', () => {
    const chapterText = [
      '枯井下方的通道比预想中更为潮湿。',
      '',
      '惨绿色的雾气在石板路上低低地漂浮，像是有生命般贴着两人的脚踝盘旋。',
      '',
      '江哲伸出右手，虚扶在老陈的肩膀上。他体内那股如恒星般炽热、狂暴的超人气血，在穿过皮下的瞬间开始稳压。',
    ].join('\n').repeat(12)
    const payload = getNovelPayload({
      content: `\`\`\`json\n{"prose_chapters":[{"chapter_no":13,"title":"盟友入局","chapter_text":"${chapterText}"}],"scene_breakdown":[],"continuity_notes":[]}\n\`\`\``,
      finish_reason: 'stop',
      usage: { output_tokens: 7562 },
    })

    expect(payload.prose_chapters?.[0]?.chapter_no).toBe(13)
    expect(payload.prose_chapters?.[0]?.title).toBe('盟友入局')
    expect(payload.prose_chapters?.[0]?.chapter_text).toBe(chapterText)
    expect(payload.chapter_text).toBe(chapterText)
    expect(payload.recovered_from_partial_json).toBe(true)
  })

  test('recovers closed chapter text when prose contains unescaped ascii quotes', () => {
    const chapterText = '他的目光落在那个写着"CN-001"的屏幕上，左手在卫衣口袋里缓缓松开了那枚已经布满裂痕的秩序核心。'.repeat(20)
    const payload = getNovelPayload({
      content: `\`\`\`json\n{"prose_chapters":[{"chapter_no":13,"title":"盟友入局","chapter_text":"${chapterText}"}],"scene_breakdown":[],"continuity_notes":[]}\n\`\`\``,
      finish_reason: 'stop',
    })

    expect(payload.prose_chapters?.[0]?.chapter_no).toBe(13)
    expect(payload.prose_chapters?.[0]?.chapter_text).toBe(chapterText)
    expect(payload.chapter_text).toBe(chapterText)
    expect(payload.recovered_from_partial_json).toBe(true)
  })


  test('defaults normal chapters to roughly 4200 Chinese characters', () => {
    const target = resolveChapterWordTarget({ length_target: 'epic' }, { chapter_no: 1 }, {})

    expect(target.mode).toBe('standard')
    expect(target.target).toBe(4200)
    expect(target.min).toBe(3200)
    expect(target.max).toBe(5200)
    expect(target.label).toContain('标准章')
  })

  test('budgets enough output tokens for reasoning-heavy prose models on standard chapters', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 3 }, {})

    expect(proseMaxTokensForWordTarget(target)).toBeGreaterThanOrEqual(16000)
  })

  test('injects long chapter target into paragraph prose prompt and raises token budget', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 12 }, { word_target_mode: 'long' })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '测试长篇' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '长章测试',
          summary: '主角进入核心冲突。',
          conflict: '必须正面解决一次重大危机。',
          ending_hook: '新的规则出现。',
          scene_cards: [],
          word_target: target,
        },
        style_lock: { chapter_word_range: target.rangeText },
      },
      null,
      { chapter_no: 12, title: '长章测试' },
    )

    expect(target.mode).toBe('long')
    expect(target.target).toBe(10000)
    expect(prompt).toContain('本章目标字数：约 10000 字')
    expect(prompt).toContain('可接受范围：9000-11000 字')
    expect(prompt).toContain('每个场景分配明确字数预算')
    expect(proseMaxTokensForWordTarget(target)).toBeGreaterThan(14000)
  })

  test('reads runtime camelCase chapterTarget sceneCards when building paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧标题',
          summary: '旧摘要。',
          conflict: '旧冲突。',
          ending_hook: '旧钩子。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 8,
          title: '会长私印',
          summary: '运行时要求围绕私印缺页展开。',
          conflict: '会长想烧掉私印，主角必须当众保住证据。',
          endingHook: '缺页背面露出第三枚私印。',
          sceneCards: [
            {
              sceneNo: 1,
              title: '私印抢夺',
              purpose: '让证据从静态设定变成当场争夺。',
              conflict: '会长伸手夺印，主角必须在众目睽睽下反制。',
              openingHook: '火舌舔到私印边缘时，缺页忽然卷起第二层。',
              readerPayoff: '主角保住旧证并逼出新的缺页线索。',
              endingHookSeed: '缺页背面露出第三枚私印。',
            },
          ],
        },
      },
      null,
      { chapter_no: 8, title: '会长私印' },
    )

    expect(prompt).toContain('运行时要求围绕私印缺页展开')
    expect(prompt).toContain('会长想烧掉私印')
    expect(prompt).toContain('私印抢夺')
    expect(prompt).toContain('主角保住旧证并逼出新的缺页线索')
    expect(prompt).toContain('缺页背面露出第三枚私印')
  })

  test('uses runtime camelCase chapterTarget endingHook over stale ending_hook in paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '会长私印',
          summary: '私印缺页被搬到堂前。',
          conflict: '主角必须阻止会长毁掉旧证。',
          ending_hook: '旧钩子。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 8,
          endingHook: '缺页背面露出第三枚私印。',
        },
      },
      null,
      { chapter_no: 8, title: '会长私印' },
    )

    expect(prompt).toContain('读者问题：缺页背面露出第三枚私印。')
    expect(prompt).toContain('下一章拉力：缺页背面露出第三枚私印。')
  })

  test('injects longform compass into paragraph prose prompt as hard story boundaries', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          immutable_rules: ['超人力量不能无代价碾压规则'],
          flexible_zones: ['副本题材可换，但必须服务规则破局主线'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作品罗盘】')
    expect(prompt).toContain('不可漂移')
    expect(prompt).toContain('超人力量不能无代价碾压规则')
    expect(prompt).toContain('副本题材可换')
  })

  test('injects camelCase pre-draft longform compass into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        preDraftBrief: {
          longformCompass: {
            readerPromise: '超人力量必须持续撞上规则判定。',
            coreConflict: '蛮力破局与规则边界互相反制。',
            immutableRules: ['超人力量不能变成无代价清场'],
            flexibleZones: ['副本可变化，但必须服务规则破局主线'],
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作品罗盘】')
    expect(prompt).toContain('超人力量必须持续撞上规则判定')
    expect(prompt).toContain('蛮力破局与规则边界互相反制')
    expect(prompt).toContain('超人力量不能变成无代价清场')
  })

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

  test('injects camelCase safe batchPreflight into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batchPreflight: {
          source: 'runtime_safe_batch_preflight',
          chapterHandoffContract: {
            source: 'runtime_safe_batch_handoff',
            fromChapterNo: 7,
            applyToChapterNo: 8,
            previousHandoff: '第7章最后一幕：禁库门牌背面响起旧广播室的铃声。',
            openingObligations: ['开篇前300字必须接住禁库门牌和旧广播室铃声。'],
            mustDeliver: ['确认旧广播室铃声不是普通设备，而是规则召唤。'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '旧广播室',
          summary: '验证旧广播室铃声。',
          conflict: '是否相信门牌背面的铃声。',
          ending_hook: '铃声倒放。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '旧广播室' },
    )

    expect(prompt).toContain('【安全连写预执行门禁】')
    expect(prompt).toContain('runtime_safe_batch_preflight')
    expect(prompt).toContain('【安全连写章节交接契约】')
    expect(prompt).toContain('禁库门牌背面响起旧广播室的铃声')
    expect(prompt).toContain('确认旧广播室铃声不是普通设备')
  })

  test('injects camelCase chapterTarget safe preflight and memory anchors into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapterTarget: {
          chapterNo: 8,
          title: '旧广播室',
          summary: '验证旧广播室铃声。',
          conflict: '是否相信门牌背面的铃声。',
          endingHook: '铃声倒放。',
          sceneCards: [],
          batchPreflight: {
            source: 'runtime_chapter_target_safe_batch',
            longformMemoryAnchor: {
              corePromise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
              openQuestions: ['旧广播室铃声是谁发出的'],
              payoffDebts: ['规则边界反制蛮力'],
            },
            chapterHandoffContract: {
              previousHandoff: '第7章最后一幕：禁库门牌背面响起旧广播室的铃声。',
              openingObligations: ['开篇前300字必须接住禁库门牌和旧广播室铃声。'],
              mustDeliver: ['确认旧广播室铃声不是普通设备，而是规则召唤。'],
            },
          },
        },
      },
      null,
      { chapter_no: 8, title: '旧广播室' },
    )

    expect(prompt).toContain('【安全连写预执行门禁】')
    expect(prompt).toContain('runtime_chapter_target_safe_batch')
    expect(prompt).toContain('【安全连写章节交接契约】')
    expect(prompt).toContain('禁库门牌背面响起旧广播室的铃声')
    expect(prompt).toContain('【长篇正史锚点】')
    expect(prompt).toContain('李超用超人蛮力碰撞规则怪谈')
    expect(prompt).toContain('旧广播室铃声是谁发出的')
  })

  test('injects safe batch expansion structure verification into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第18-20章',
          batch_goal: '验证修后的中段扩批结构。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            label: '扩批结构验证',
            repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
            validation_chapter_nos: [18, 19, 20],
            fixed_segment_role: '中段固定职责：每批第3-4章必须完成主线转折、显性回报和章末追读。',
            conflict_rotation: '未来验证批次每章必须更换冲突来源。',
            explicit_payoff: '每章至少一个显性回报，不能只铺垫。',
            ending_hook_requirement: '每章章末必须留下不同的追读问题。',
            structure_actions: ['前段抛压，中段兑现并升级，后段留钩。'],
          },
        },
        chapter_target: {
          chapter_no: 18,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 18, title: '外门夜钟' },
    )

    expect(prompt).toContain('【扩批结构验证】')
    expect(prompt).toContain('执行 next_batch_brief.expansion_structure_verification')
    expect(prompt).toContain('中段连续 2 次')
    expect(prompt).toContain('每章必须更换冲突来源')
    expect(prompt).toContain('每章至少一个显性回报')
    expect(prompt).toContain('每章章末必须留下不同的追读问题')
  })

  test('injects default five-chapter rollback evidence into expansion validation prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第68-70章',
          batch_goal: '默认5章档位回退后的3章验证。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            label: '扩批结构验证',
            repeated_hotspot_segment: { key: 'middle', label: '中段', count: 1 },
            validation_chapter_nos: [68, 69, 70],
            fixed_segment_role: '默认档位回退：中段必须重新证明主线转折、显性回报和章末追读。',
            conflict_rotation: '验证批每章必须更换冲突来源。',
            explicit_payoff: '每章至少一个显性回报。',
            ending_hook_requirement: '每章章末必须留下不同追读问题。',
            default_five_chapter_regression: {
              status: 'regressed',
              label: '默认5章档位回退原因',
              default_batch_chapter_nos: [63, 64, 65, 66, 67],
              restore_chapter_nos: [58, 59, 60, 61, 62],
              validation_chapter_nos: [50, 51, 52],
              repeated_hotspot_segment: { key: 'middle', label: '中段', risk_count: 3 },
              failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              summary: '默认5章档位回退原因：连续 2 批恢复稳定后，第63、64、65、66、67章默认档位在中段复发。',
            },
          },
        },
        chapter_target: {
          chapter_no: 68,
          title: '外门夜钟',
          summary: '验证默认档位回退后的中段结构。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 68, title: '外门夜钟' },
    )

    expect(prompt).toContain('默认5章档位回退')
    expect(prompt).toContain('失效批次：第63章、第64章、第65章、第66章、第67章')
    expect(prompt).toContain('恢复依据：第58章、第59章、第60章、第61章、第62章')
    expect(prompt).toContain('前置3章验证：第50章、第51章、第52章')
    expect(prompt).toContain('失败维度：核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('逐章证明核心守恒、显性回报和章末追读')
  })

  test('injects default five-chapter lane template verification into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第90-92章',
          batch_goal: '默认档位模板修复后进入3章验证批。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_decision_mismatch',
            validation_chapter_nos: [90, 91, 92],
            fixed_segment_role: '默认 5 章档位验证批必须逐章继承前段、中段、后段的段位职责模板。',
            conflict_rotation: '默认 5 章档位验证批必须逐章轮换冲突来源。',
            explicit_payoff: '默认 5 章档位验证批必须逐章交付显性回报。',
            ending_hook_requirement: '默认 5 章档位验证批必须逐章落地章末追读模板。',
            default_five_chapter_lane_template: {
              visible: true,
              status: 'fulfilled',
              label: '默认5章档位模板回检',
              summary: '默认5章档位模板已补齐。下一轮验证批逐章继承四项模板。',
              segment_duty_rewrite: '段位职责重写：前段压迫、中段兑现、后段升级钩子。',
              conflict_rotation: '冲突轮换：规则压迫、人物对抗、信息误导三类轮换。',
              payoff_density: '回报密度：每章至少交付一个显性回报。',
              ending_hook_template: '章末追读模板：最后 300 字落触发事件、读者问题、下一章风险。',
              repaired_missing_requirements: [
                { key: 'default_lane_payoff_density', label: '回报密度', chapter_nos: [91] },
              ],
              repair_actions: [
                '回报密度修复：第91章必须补出显性回报，让读者看到收益、反制结果或阶段结算。',
              ],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
            },
          },
        },
        chapter_target: {
          chapter_no: 90,
          title: '模板验证一',
          summary: '验证默认档位模板是否稳定。',
          conflict: '是否按新模板推进第一章。',
          ending_hook: '新模板第一处风险抬头。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 90, title: '模板验证一' },
    )

    expect(prompt).toContain('默认5章档位模板回检')
    expect(prompt).toContain('下一轮验证批逐章继承')
    expect(prompt).toContain('默认档位段位职责、冲突轮换、回报密度、章末追读模板')
    expect(prompt).toContain('段位职责重写：前段压迫')
    expect(prompt).toContain('冲突轮换：规则压迫')
    expect(prompt).toContain('回报密度：每章至少交付')
    expect(prompt).toContain('章末追读模板：最后 300 字')
    expect(prompt).toContain('模板缺项修复：第91章缺回报密度')
    expect(prompt).toContain('缺项修复动作：回报密度修复：第91章必须补出显性回报')
    expect(prompt).toContain('逐章证明四项模板没有复发')
    expect(prompt).toContain('default_lane_segment_duty_delivered')
    expect(prompt).toContain('default_lane_conflict_rotation_delivered')
    expect(prompt).toContain('default_lane_payoff_density_delivered')
    expect(prompt).toContain('default_lane_ending_hook_template_delivered')
  })

  test('injects default lane template redesign execution standards into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第96-98章',
          batch_goal: '默认档位模板重构后进入3章验证批。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            validation_chapter_nos: [96, 97, 98],
            fixed_segment_role: '中段固定职责：验证新默认档位模板。',
            conflict_rotation: '验证批每章更换冲突来源。',
            explicit_payoff: '验证批每章必须有显性回报。',
            ending_hook_requirement: '验证批每章章末必须留下追读问题。',
            default_five_chapter_lane_template: {
              visible: true,
              status: 'fulfilled',
              label: '默认5章档位模板重构',
              source: 'safe_batch_expansion_structure_repair',
              redesign_source: 'default_five_chapter_lane_template_redesign_queue',
              summary: '默认档位模板已重构：回报密度失败 2 次已改为逐章显性结算。',
              top_failed_requirement: {
                key: 'default_lane_payoff_density',
                label: '回报密度',
                failed_count: 2,
              },
              segment_duty_rewrite: '新模板：第1章抛出规则压迫，第2章制造误导反转，第3章兑现阶段收益。',
              conflict_rotation: '新模板：规则压迫、人物对抗、信息误导按章轮换。',
              payoff_density: '新模板：每章必须有可见收益、反制结果或阶段结算。',
              ending_hook_template: '新模板：最后300字必须落触发事件、读者问题和下一章风险。',
              redesigned_templates: [
                { key: 'default_lane_payoff_density', label: '回报密度', template: '新模板：每章必须有可见收益、反制结果或阶段结算。' },
              ],
              validation_standard: [
                '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
                '连续2批模板全过后才能恢复默认5章档位。',
              ],
              required_receipts: [
                'default_lane_segment_duty_delivered',
                'default_lane_conflict_rotation_delivered',
                'default_lane_payoff_density_delivered',
                'default_lane_ending_hook_template_delivered',
              ],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
            },
          },
        },
        chapter_target: {
          chapter_no: 96,
          title: '模板重构验证一',
          summary: '验证默认档位模板重构是否稳定。',
          conflict: '新模板第一章是否能守住回报密度。',
          ending_hook: '验证失败的风险抬头。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 96, title: '模板重构验证一' },
    )

    expect(prompt).toContain('模板重构来源：default_five_chapter_lane_template_redesign_queue')
    expect(prompt).toContain('高频缺项：回报密度失败 2 次')
    expect(prompt).toContain('重构模板：回报密度：新模板：每章必须有可见收益')
    expect(prompt).toContain('下一轮验证标准：下一轮3章验证批必须逐章回填 default_lane_*_delivered。；连续2批模板全过后才能恢复默认5章档位。')
    expect(prompt).toContain('逐章回填字段：default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered')
    expect(prompt).toContain('默认5章档位模板验证：本章必须继承已补齐的段位职责')
  })

  test('injects production relapse template version proof into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第114-116章',
          batch_goal: '默认档位模板生产复发后进入3章验证批。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            validation_chapter_nos: [114, 115, 116],
            fixed_segment_role: '中段固定职责：验证生产后验新模板。',
            conflict_rotation: '验证批每章更换冲突来源。',
            explicit_payoff: '验证批每章必须有显性回报。',
            ending_hook_requirement: '验证批每章章末必须留下追读问题。',
            default_five_chapter_lane_template: {
              visible: true,
              status: 'fulfilled',
              label: '默认档位模板生产复发重构',
              source: 'safe_batch_expansion_structure_repair',
              redesign_source: 'default_five_chapter_lane_template_redesign_queue',
              summary: '默认档位模板版本 safe_batch_expansion_structure_repair:668 在真实5章生产复发，已按生产后验重构。',
              template_version_id: 'safe_batch_expansion_structure_repair:668',
              production_relapse_count: 1,
              production_relapse_review: {
                template_version_id: 'safe_batch_expansion_structure_repair:668',
                default_batch_chapter_nos: [109, 110, 111, 112, 113],
                restore_chapter_nos: [104, 105, 106, 107, 108],
                validation_chapter_nos: [96, 97, 98],
                failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                failed_requirements: [
                  { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
                  { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
                  { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
                ],
                summary: '第109-113章真实生产复发，当前模板版本必须证明核心、回报、追读三项后验修复。',
              },
              failed_requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移', failed_count: 1 },
                { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', failed_count: 1 },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力', failed_count: 1 },
              ],
              redesigned_templates: [
                { key: 'default_lane_payoff_density', label: '回报密度', template: '生产后验新模板：每章必须落一个可见收益、反制结果或阶段结算。' },
              ],
              validation_standard: [
                '下一轮3章验证批必须逐章对照 template_version_id safe_batch_expansion_structure_repair:668 和真实生产复发章节。',
                '逐章证明新版模板已修掉真实生产失败维度：核心偏移、回报欠账、追读拉力。',
              ],
              required_receipts: [
                'default_lane_segment_duty_delivered',
                'default_lane_conflict_rotation_delivered',
                'default_lane_payoff_density_delivered',
                'default_lane_ending_hook_template_delivered',
              ],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
            },
          },
        },
        chapter_target: {
          chapter_no: 114,
          title: '生产后验验证一',
          summary: '验证当前模板版本是否修掉真实生产复发。',
          conflict: '新模板第一章是否能守住核心和回报。',
          ending_hook: '复发风险再次抬头。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 114, title: '生产后验验证一' },
    )

    expect(prompt).toContain('模板版本：safe_batch_expansion_structure_repair:668')
    expect(prompt).toContain('生产复发次数：1')
    expect(prompt).toContain('生产复发章节：第109章、第110章、第111章、第112章、第113章')
    expect(prompt).toContain('生产复发前验证：第96章、第97章、第98章')
    expect(prompt).toContain('生产恢复依据：第104章、第105章、第106章、第107章、第108章')
    expect(prompt).toContain('真实生产失败维度：核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('生产复发模板缺项：默认档位段位职责/核心偏移；回报密度/回报欠账；章末追读模板/追读拉力')
    expect(prompt).toContain('模板版本后验验证：本轮3章验证批必须逐章对照 template_version_id safe_batch_expansion_structure_repair:668')
    expect(prompt).toContain('逐章证明新版模板已修掉真实生产失败维度：核心偏移、回报欠账、追读拉力')
  })

  test('injects expansion structure decision into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第70-74章',
          batch_goal: '恢复五章扩批但继续执行段位职责。',
          expansion_structure_decision: {
            visible: true,
            label: '结构修复决策',
            recommendation: 'restore_five_chapter',
            target_chapter_count: 5,
            mode_label: '恢复5章扩批',
            segment_label: '中段',
            summary: '中段结构修复有效性：通过率 67% -> 100%，失败主因 3 -> 0，修复后暂无同段复发。',
            instruction: '恢复 5 章扩批，但每章必须明确前段/中段/后段职责，不能因为放大批次而淡化结构约束。',
            observation_metrics: ['通过率 67% -> 100%', '失败主因 3 -> 0', '修复后暂无同段复发'],
          },
        },
        chapter_target: {
          chapter_no: 70,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 70, title: '外门夜钟' },
    )

    expect(prompt).toContain('【扩批结构决策】')
    expect(prompt).toContain('执行 next_batch_brief.expansion_structure_decision')
    expect(prompt).toContain('restore_five_chapter')
    expect(prompt).toContain('恢复 5 章扩批')
    expect(prompt).toContain('通过率 67% -> 100%')
    expect(prompt).toContain('失败主因 3 -> 0')
    expect(prompt).toContain('expansion_structure_decision_execution')
    expect(prompt).toContain('segment_role_delivered')
    expect(prompt).toContain('observation_metrics_delivered')
  })

  test('injects default five-chapter lane redesign obligations into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第89章',
          batch_goal: '恢复判定连续失效后先重写默认五章档位。',
          expansion_structure_decision: {
            visible: true,
            label: '结构修复决策',
            recommendation: 'escalate_structure_redesign',
            target_chapter_count: 1,
            mode_label: '单章结构重构',
            segment_label: '中段',
            summary: '连续 2 次恢复判定失效：核心偏移、回报欠账、追读拉力同维复发，默认档位结构重构。',
            instruction: '默认 5 章档位连续恢复判定失效，本章先重写默认档位结构。',
            observation_metrics: ['恢复判定连续失效 2 次', '同维复发：核心偏移、回报欠账、追读拉力'],
            default_five_chapter_lane_redesign: {
              reason: 'repeated_recovery_verdict_relapse',
              relapse_count: 2,
              repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              segment_duty_rewrite: '段位职责重写：定义默认 5 章内前段、中段、后段各自承担的冲突、信息、回报和钩子职责。',
              conflict_rotation: '冲突轮换：五章内至少更换规则压迫、人物对抗、信息误导三类冲突来源。',
              payoff_density: '回报密度：每章都要有显性回报，不能连续两章只铺垫。',
              ending_hook_template: '章末追读模板：每章最后 300 字给出触发事件、读者问题、下一章风险升级。',
            },
          },
        },
        chapter_target: {
          chapter_no: 89,
          title: '默认档重构',
          summary: '重写五章档位结构。',
          conflict: '是否暂停扩批并重设节奏。',
          ending_hook: '新的五章模板露出第一处风险。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 89, title: '默认档重构' },
    )

    expect(prompt).toContain('默认5章档位结构重构')
    expect(prompt).toContain('连续恢复判定失效')
    expect(prompt).toContain('核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('段位职责重写')
    expect(prompt).toContain('冲突轮换')
    expect(prompt).toContain('回报密度')
    expect(prompt).toContain('章末追读模板')
    expect(prompt).toContain('repeated_recovery_verdict_relapse')
    expect(prompt).toContain('default_lane_segment_duty_delivered')
    expect(prompt).toContain('default_lane_conflict_rotation_delivered')
    expect(prompt).toContain('default_lane_payoff_density_delivered')
    expect(prompt).toContain('default_lane_ending_hook_template_delivered')
  })

  test('injects longform memory anchor from safe batch preflight into paragraph prose prompt', () => {
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
          longform_memory_anchor: {
            last_updated_chapter: 7,
            core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
            current_volume_goal: '午夜校园中活过第一轮规则。',
            character_states: ['李超：力量觉醒但不懂规则@宿舍楼大厅'],
            open_questions: ['广播是谁发出的'],
            payoff_debts: ['规则边界反制蛮力'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '宿舍水痕',
          summary: '追查广播与门外学生的联系。',
          conflict: '蛮力试探规则边界。',
          ending_hook: '广播第一次叫出李超真名。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '宿舍水痕' },
    )

    expect(prompt).toContain('【长篇正史锚点】')
    expect(prompt).toContain('李超用超人蛮力碰撞规则怪谈')
    expect(prompt).toContain('广播是谁发出的')
    expect(prompt).toContain('规则边界反制蛮力')
  })

  test('injects longform memory capsule into paragraph prose prompt for single chapter drafting', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
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
          conflict: '藏拙保命还是公开争取试炼资格。',
          ending_hook: '阵盘裂纹在众人面前亮起。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '试炼前夜' },
    )

    expect(prompt).toContain('【长篇记忆胶囊】')
    expect(prompt).toContain('寒门少年以阵法改写宗门秩序')
    expect(prompt).toContain('残阵缺口为什么会回应旧案禁制')
    expect(prompt).toContain('试炼资格被夺后的公开打脸回报')
    expect(prompt).toContain('主角不能脱离阵法成长线')
    expect(prompt).toContain('执行 chapter_target.longform_memory_capsule')
  })

  test('injects camelCase longform memory capsule item states into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '万古长夜' },
      {
        preDraftBrief: {
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
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          conflict: '藏拙保命还是公开争取试炼资格。',
          ending_hook: '阵盘裂纹在众人面前亮起。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '试炼前夜' },
    )

    expect(prompt).toContain('【长篇记忆胶囊】')
    expect(prompt).toContain('李玄：右手阵纹失控，仍被迫藏拙@第7章')
    expect(prompt).toContain('旧案禁制：残阵缺口为什么会回应旧案禁制@第7章')
  })

  test('injects million word runway into paragraph prose prompt as the chapter course guard', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        million_word_runway: {
          status: 'ready',
          label: '航线可连续',
          bandLabel: '第1个10万字',
          safeModeLabel: '小批量连写 3 章',
          fourQuestions: [
            { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用', status: 'ok' },
            { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因', status: 'ok' },
            { key: 'mainline_move', label: '主线推进了什么', answer: '双主角确认规则并非不可破解', status: 'ok' },
            { key: 'freshness', label: '这一章的新意在哪', answer: '超人力量先被规则压制再反制', status: 'ok' },
          ],
          redLines: ['超人力量不能无代价碾压规则'],
          readerFuel: ['规则反制爽点', '门外学生章末钩子'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【百万字航线守门】')
    expect(prompt).toContain('本章四问')
    expect(prompt).toContain('第一次证明规则边界能被利用')
    expect(prompt).toContain('超人力量不能无代价碾压规则')
    expect(prompt).toContain('规则反制爽点')
    expect(prompt).toContain('执行 chapter_target.million_word_runway')
  })

  test('injects camelCase million word runway from pre-draft context into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        preDraftBrief: {
          millionWordRunway: {
            status: 'ready',
            label: '航线可连续',
            bandLabel: '第1个10万字',
            safeModeLabel: '小批量连写 3 章',
            fourQuestions: [
              { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用', status: 'ok' },
              { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因', status: 'ok' },
            ],
            redLines: ['超人力量不能无代价碾压规则'],
            readerFuel: ['规则反制爽点', '门外学生章末钩子'],
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【百万字航线守门】')
    expect(prompt).toContain('第一次证明规则边界能被利用')
    expect(prompt).toContain('超人力量不能无代价碾压规则')
    expect(prompt).toContain('门外学生章末钩子')
  })

  test('injects camelCase million word runway from runtime chapterTarget into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapterTarget: {
          chapterNo: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          endingHook: '门外出现湿漉漉的学生。',
          sceneCards: [],
          millionWordRunway: {
            status: 'ready',
            label: '航线可连续',
            bandLabel: '第1个10万字',
            safeModeLabel: '小批量连写 3 章',
            fourQuestions: [
              { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用', status: 'ok' },
              { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因', status: 'ok' },
            ],
            redLines: ['超人力量不能无代价碾压规则'],
            readerFuel: ['规则反制爽点', '门外学生章末钩子'],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【百万字航线守门】')
    expect(prompt).toContain('第一次证明规则边界能被利用')
    expect(prompt).toContain('超人力量不能无代价碾压规则')
    expect(prompt).toContain('门外学生章末钩子')
  })

  test('injects chapter launch gate into paragraph prose prompt as pre-draft guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_launch_gate: {
          status: 'ready',
          summary: '当前章已对齐读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子。',
          signals: [
            { key: 'reader_promise', label: '读者承诺', status: 'ok', detail: '本章必须服务：超人力量和规则判定持续碰撞。' },
            { key: 'core_conflict', label: '核心冲突', status: 'ok', detail: '冲突：是否用蛮力冲出宿舍。' },
          ],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【本章开写门禁】')
    expect(prompt).toContain('读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子')
    expect(prompt).toContain('超人力量和规则判定持续碰撞')
    expect(prompt).toContain('是否用蛮力冲出宿舍')
    expect(prompt).toContain('执行 chapter_target.chapter_launch_gate')
  })

  test('injects camelCase pre-draft chapter launch gate into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        preDraftBrief: {
          chapterLaunchGate: {
            status: 'warn',
            summary: '当前章必须补强读者承诺、章节目标和章末钩子。',
            signals: [
              { key: 'reader_promise', label: '读者承诺', status: 'warn', detail: '本章必须服务：超人力量和规则判定持续碰撞。' },
              { key: 'ending_hook', label: '章末钩子', status: 'warn', detail: '章末必须留下门外学生身份问题。' },
            ],
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【本章开写门禁】')
    expect(prompt).toContain('当前章必须补强读者承诺、章节目标和章末钩子')
    expect(prompt).toContain('超人力量和规则判定持续碰撞')
    expect(prompt).toContain('门外学生身份问题')
  })

  test('injects governance recheck memory into paragraph prose prompt as single-chapter guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        governance_recheck_memory: {
          source_run_id: 44,
          status: 'closed',
          label: '治理复查已记录',
          summary: '恢复依据闭环 2/2，本章必须继续继承上一轮修后证据。',
          evidence: ['第42章对白交锋已补回样章节奏'],
          failed_evidence: [],
          watch_items: ['下一章继续观察样章策略命中率'],
          storyline_decision_task_count: 0,
        },
        chapter_target: {
          chapter_no: 43,
          title: '复查后的新局',
          summary: '主角用新证据逼对手公开应答。',
          conflict: '对手试图绕开上一轮修复后的对白交锋。',
          ending_hook: '旧账本出现第二个签名。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 43, title: '复查后的新局' },
    )

    expect(prompt).toContain('【治理复查承接】')
    expect(prompt).toContain('第42章对白交锋已补回样章节奏')
    expect(prompt).toContain('下一章继续观察样章策略命中率')
    expect(prompt).toContain('执行 chapter_target.governance_recheck_memory')
  })

  test('injects core contract radar into paragraph prose prompt as hard guardrails', () => {
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
          core_contract_radar: {
            summary: '本章必须把超人力量撞上规则判定写成可见事件。',
            must_serve: ['超人力量和规则判定持续碰撞', '蛮力破局与规则判定的对抗'],
            no_drift: ['不能把规则怪谈写成纯打怪'],
            repair_focus: ['补足规则判定反制蛮力'],
            periodic_drift_check: {
              cadence: '每10章',
              due: true,
              question: '当初吸引读者的卖点还在吗？',
              selling_points: ['超人能力被规则空间反制。'],
            },
            checks: [{ key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '碰撞不够可见' }],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【核心契约】')
    expect(prompt).toContain('必须服务')
    expect(prompt).toContain('不得漂移')
    expect(prompt).toContain('超人力量和规则判定持续碰撞')
    expect(prompt).toContain('不能把规则怪谈写成纯打怪')
    expect(prompt).toContain('执行 chapter_target.core_contract_radar')
    expect(prompt).toContain('十章卖点复核')
    expect(prompt).toContain('当初吸引读者的卖点还在吗')
  })

  test('injects camelCase pre-draft core contract radar into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        preDraftBrief: {
          coreContractRadar: {
            summary: '本章必须把规则反制爽点写成现场事件。',
            mustServe: ['读者承诺必须维持规则反制爽点'],
            noDrift: ['不能把校园怪谈改写成纯战斗副本'],
            repairFocus: ['补足规则判定压住蛮力的可见代价'],
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【核心契约】')
    expect(prompt).toContain('必须服务：读者承诺必须维持规则反制爽点')
    expect(prompt).toContain('不得漂移：不能把校园怪谈改写成纯战斗副本')
    expect(prompt).toContain('优先修正：补足规则判定压住蛮力的可见代价')
  })

  test('injects longform battle context into paragraph prose prompt as chapter obligations', () => {
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
          longform_battle_context: {
            status: 'needs_action',
            summary: '先修复读者拉力和核心守恒。',
            risk_chips: ['核心偏移', '前30章留存'],
            primary_action: { label: '运行前30章诊断', reason: '补开篇钩子和章末追读。' },
            risk_lanes: [
              {
                key: 'story_core',
                label: '核心守恒',
                status: 'warn',
                detail: '核心偏移：超人力量被写成普通无敌碾压。',
                required_action: '本章必须写出规则判定反制蛮力。',
              },
              {
                key: 'reader_pull',
                label: '读者拉力',
                status: 'block',
                detail: '前30章留存弱：开篇钩子不足。',
                required_action: '前300字给危机，章末留下门外学生悬念。',
              },
            ],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作战承接】')
    expect(prompt).toContain('先修复读者拉力和核心守恒')
    expect(prompt).toContain('本章必须写出规则判定反制蛮力')
    expect(prompt).toContain('前300字给危机')
    expect(prompt).toContain('执行 chapter_target.longform_battle_context')
  })

  test('injects camelCase pre-draft longform battle context into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        preDraftBrief: {
          longformBattleContext: {
            status: 'needs_action',
            summary: '本章必须把长篇核心拉回规则反制。',
            riskChips: ['核心漂移', '读者拉力弱'],
            primaryAction: {
              key: 'repair_story_core',
              label: '修复核心守恒',
              reason: '正文必须让超人力量被规则判定反制。',
            },
            riskLanes: [
              {
                key: 'story_core',
                label: '核心守恒',
                status: 'warn',
                detail: '核心漂移：超人力量像普通无敌流。',
                requiredAction: '写出规则判定压住蛮力的现场代价。',
              },
            ],
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作战承接】')
    expect(prompt).toContain('本章必须把长篇核心拉回规则反制')
    expect(prompt).toContain('写出规则判定压住蛮力的现场代价')
    expect(prompt).toContain('执行 chapter_target.longform_battle_context')
  })

  test('merges runtime chapterTarget longform battle context into paragraph prose prompt when chapter_target already exists', () => {
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
          longformBattleContext: {
            status: 'needs_action',
            summary: '运行时诊断要求本章补回长篇作战风险。',
            riskChips: ['作战台漏接'],
            riskLanes: [
              {
                key: 'reader_pull',
                label: '读者拉力',
                status: 'block',
                detail: '上一轮诊断发现章末追读不足。',
                requiredAction: '章末必须留下湿漉漉学生的身份悬念。',
              },
            ],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作战承接】')
    expect(prompt).toContain('运行时诊断要求本章补回长篇作战风险')
    expect(prompt).toContain('章末必须留下湿漉漉学生的身份悬念')
  })

  test('injects reader expectation debt into paragraph prose prompt as carry-over obligations', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: {
          must_carry: [
            { from_chapter_no: 2, key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门' },
          ],
          keep_alive: [
            { from_chapter_no: 2, key: 'open_question', label: '保留悬念', type: 'question', text: '广播是谁发出的' },
          ],
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          ending_hook: '玻璃门上的水迹拼出一个名字。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【期待债务承接】')
    expect(prompt).toContain('上一章或最近章节欠下的期待必须在本章可见推进')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('广播是谁发出的')
  })

  test('injects previous chapter handoff into paragraph prose prompt as opening obligation', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          previous_handoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【上一章尾段原文承接】')
    expect(prompt).toContain('前300字必须接住上一章最后一幕')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('不能只复述摘要或改写成新的开场')
    expect(prompt).toContain('不得重新从泛环境描写、空泛醒来或无关解释开场')
  })

  test('injects camelCase chapter handoff contract previousHandoff into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          chapterHandoffContract: {
            previousHandoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          },
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【上一章尾段原文承接】')
    expect(prompt).toContain('前300字必须接住上一章最后一幕')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('不能只复述摘要或改写成新的开场')
  })

  test('injects pre-draft camelCase chapter handoff contract into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        pre_draft_brief: {
          chapterHandoffContract: {
            previousHandoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          },
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【上一章尾段原文承接】')
    expect(prompt).toContain('前300字必须接住上一章最后一幕')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('不能只复述摘要或改写成新的开场')
  })

  test('injects pre-draft camelCase chapter blueprint into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        pre_draft_brief: {
          chapterBlueprint: {
            version: 'oh_story_chapter_blueprint_v1',
            targetEmotion: '压迫后反制释放',
            openingHook: '湿漉漉学生敲响玻璃门',
            corePayoff: '主角当场识破暗号诱导',
            contentOutline: {
              cause: '门外学生用暗号诱导开门',
              development: '主角用规则反问拖住对方',
              turn: '暗号露出破绽',
              climax: '主角识破诱饵',
              ending: '玻璃门水痕拼出新名字',
            },
          },
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【章节蓝图合同】')
    expect(prompt).toContain('必须先执行 chapter_target.chapter_blueprint')
    expect(prompt).toContain('主角当场识破暗号诱导')
  })

  test('builds a chapter attraction review from hooks, scene drive, payoff, page-turn and spread scene', () => {
    const report = buildChapterAttractionReviewReport(
      { id: 5, title: '超人的规则怪谈世界' },
      { id: 8, chapter_no: 2, title: '第一条规则' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          reader_retention_brief: {
            opening_hook: '十点整，宿舍外所有路灯同时熄灭。',
            payoff_promise: '李超第一次发现蛮力会被规则边界反制。',
            short_drama_scene: '玻璃门外黑暗贴着门槛白线移动。',
            ending_question: '门外湿漉漉的学生说出李超的死因。',
          },
          scene_cards: [
            {
              title: '十点门槛',
              goal: '验证十点后不得离开宿舍的规则。',
              conflict: '李超想冲出去，张智必须阻止。',
              turning_point: '饼干碎屑越过门槛后被黑暗清除。',
              reader_payoff: '规则第一次反制超人蛮力。',
            },
          ],
        },
      },
      [
        '十点整，宿舍外所有路灯同时熄灭。',
        '宿舍大厅里，三个人听见挂钟咔哒一声。',
        '李超站在门口，想冲出去试试自己的力量。',
        '张智拦住他，用饼干碎屑试探门槛。',
        '碎屑越过门槛后消失，黑暗贴着白线移动。',
        '他第一次清楚发现，蛮力会被规则边界反制，自己再强也绕不过判定。',
        '门外湿漉漉的学生敲了敲玻璃，说出了李超的死因。',
      ].join('\n\n'),
    )

    expect(report.status).toBe('ok')
    expect(report.score).toBeGreaterThanOrEqual(80)
    expect(report.label).toBe('吸引力 OK')
    expect(report.dimensions.map((item: any) => item.key)).toEqual([
      'opening_hook',
      'scene_drive',
      'payoff_density',
      'page_turn',
      'spread_scene',
    ])
    expect(report.priority_repair).toBe('')
  })

  test('reads raw camelCase attraction briefs after delivery', () => {
    const report = buildChapterAttractionReviewReport(
      { id: 5, title: '超人的规则怪谈世界' },
      {
        id: 28,
        chapter_no: 28,
        title: '倒放录音',
        raw_payload: {
          preDraftBrief: {
            readerRetentionBrief: {
              openingHook: '旧广播室磁带突然倒放。',
              payoffPromise: '李超用倒放录音反制门锁规则。',
              shortDramaScene: '磁带倒转时，未来回答先于提问响起。',
              endingQuestion: '下一盘磁带为什么写着李超的名字。',
            },
            sceneBriefs: [
              {
                goal: '确认旧广播室磁带来源。',
                conflict: '门锁规则会反噬硬闯者。',
                turningPoint: '倒放录音暴露门锁暗号。',
                readerPayoff: '李超反制门锁规则。',
              },
            ],
          },
        },
      },
      {},
      [
        '旧广播室磁带突然倒放。',
        '李超想确认旧广播室磁带来源，却发现门锁规则会反噬硬闯者。',
        '倒放录音暴露门锁暗号，他用倒放录音反制门锁规则。',
        '磁带倒转时，未来回答先于提问响起。',
        '最后，下一盘磁带写着李超的名字。',
      ].join('\n\n'),
    )

    expect(report.dimensions.find((item: any) => item.key === 'scene_drive')?.expected).toContain('倒放录音暴露门锁暗号')
    expect(report.dimensions.find((item: any) => item.key === 'payoff_density')?.expected).toContain('反制门锁规则')
    expect(report.status).toBe('ok')
  })

  test('warns when chapter attraction misses page-turn and visible payoff', () => {
    const report = buildChapterAttractionReviewReport(
      { id: 5, title: '超人的规则怪谈世界' },
      { id: 8, chapter_no: 2, title: '第一条规则' },
      {
        chapter_target: {
          reader_retention_brief: {
            opening_hook: '十点整，宿舍外所有路灯同时熄灭。',
            payoff_promise: '李超第一次发现蛮力会被规则边界反制。',
            short_drama_scene: '玻璃门外黑暗贴着门槛白线移动。',
            ending_question: '门外湿漉漉的学生说出李超的死因。',
          },
          scene_cards: [
            { title: '十点门槛', goal: '验证规则', conflict: '想出去但不能出去', reader_payoff: '规则反制蛮力' },
          ],
        },
      },
      '李超和张智在大厅里讨论规则。林晓解释自己见过很多人消失。三个人坐着等天亮。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toContain('吸引力缺口')
    expect(report.weak_count).toBeGreaterThanOrEqual(2)
    expect(report.priority_repair).toContain('章末')
    expect(report.dimensions.find((item: any) => item.key === 'page_turn')?.status).toBe('warn')
    expect(report.next_actions.join('；')).toContain('前300字')
    expect(report.next_actions.join('；')).toContain('最后300字')
  })

  test('checks protagonist choice, cost and state change as story drive after delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 12, chapter_no: 12, title: '试炼资格' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        chapter_goal: '主角拿到试炼资格',
        core_conflict: '执事设局阻拦主角参加试炼',
        protagonist_choice: '主角当众选择用残阵反证阵图归属',
        choice_cost: '暴露阵盘裂纹，招来内门势力注意',
        state_change: '主角从被动挨压转为主动入局',
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
    const drivenText = [
      '执事设局阻拦主角参加试炼，当众逼他交出阵图。',
      '主角没有退。他当众选择用残阵反证阵图归属，把残阵压在长案上。',
      '阵盘裂纹随之暴露，内门势力第一次注意到他，这就是选择代价。',
      '但他也因此拿到试炼资格，从被动挨压转为主动入局。',
    ].join('\n')
    const flatText = '执事在阵堂说了很多规矩，众人议论纷纷。主角听完解释，决定以后再想办法。夜色渐深，大家散去。'

    const okReport = buildStoryDriveSyncReport(project, chapter, contextPackage, drivenText)
    const warnReport = buildStoryDriveSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('故事力 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('故事力缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('主角选择')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('选择代价')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('状态变化')
    expect(warnReport.next_actions.join('；')).toContain('主角主动选择')
  })

  test('reads raw camelCase story drive scene briefs after delivery', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = {
      id: 25,
      chapter_no: 25,
      title: '旧广播室',
      raw_payload: {
        preDraftBrief: {
          chapterGoal: '李超进入旧广播室拿到原始录音',
          coreConflict: '旧广播室门锁会按蛮力反噬闯入者',
          protagonistChoice: '李超选择收住蛮力，让张智用暗号反解门锁',
          choiceCost: '李超暴露自己会被录音提前预判的风险',
          stateChange: '小队从被广播追杀转为掌握第一段反证录音',
          causalNextStep: '下一章必须查出录音是谁提前录下的',
          sceneBriefs: [
            {
              goal: '进入旧广播室',
              conflict: '门锁按蛮力反噬闯入者',
              turningPoint: '张智用暗号反解门锁',
              readerPayoff: '小队拿到第一段反证录音',
              exitState: '小队掌握反证录音',
            },
          ],
        },
      },
    }
    const report = buildStoryDriveSyncReport(
      project,
      chapter,
      {},
      [
        '李超进入旧广播室前，门锁按蛮力反噬闯入者，拳风刚起就被弹回。',
        '他选择收住蛮力，让张智用暗号反解门锁。',
        '门开后，小队拿到第一段反证录音，也暴露自己会被录音提前预判的风险。',
        '小队从被广播追杀转为掌握第一段反证录音，下一章必须查出录音是谁提前录下的。',
      ].join('\n'),
    )

    expect(report.label).not.toBe('故事力未配置')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['本章目标', '明确阻碍', '主角选择', '选择代价', '状态变化', '下一步因果']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a story_drive_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyDriveSync, reviewType: 'story_drive_sync'")
    expect(source).toContain('buildStoryDriveSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.story_drive_sync = storyDriveSync')
  })

  test('checks oh-story setup escalation payoff carry-over after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        story_loop_contract: {
          setup: '旧账册当众压罪，沈砚必须先承压',
          escalation: '执事逼证人改口并抢走解释权',
          payoff: '沈砚用旧印章反证账册被调换',
          carry_over: '旧印章背面露出第二个证人的名字',
          nested_loop_rules: [
            '多级嵌套：小循环 -> 中循环（次级目标）-> 大循环（卷目标）。',
            '小循环中必须铺垫大循环的期待。',
            '在重复中变化：同一核心卖点要换不同角度/不同矛盾，不能只反复用同一个梗换对象。',
          ],
          quality_checks: ['目标 -> 阻碍 -> 行动 -> 反馈 -> 新期待必须闭环。'],
        },
      },
    }
    const loopText = [
      '旧账册当众压罪，沈砚先被迫承压，审判席上无人替他说话。',
      '执事逼证人改口，又抢走解释权，把所有旁观弟子压进同一个结论。',
      '沈砚等他话音落尽，才用旧印章反证账册被调换，执事第一次失声。',
      '反馈落下后，旧印章背面露出第二个证人的名字，新的期待接到下一章。',
      '这个小循环完成旧账反证，中循环转向查出调包链，大循环继续指向宗门账册背后的资源黑幕；同一反证核心卖点换成证人、印章和账册三种角度推进。',
    ].join('\n')
    const flatText = '沈砚解释了账册问题。执事有些尴尬，大家知道他没有错。事情进入下一阶段。后面只是反复用同一个梗换对象。'

    const okReport = buildStoryLoopSyncReport(project, chapter, contextPackage, loopText)
    const warnReport = buildStoryLoopSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('故事循环 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['铺垫入局', '升级阻碍', '兑现反馈', '承接期待', '循环嵌套期待']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('故事循环缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['升级阻碍', '兑现反馈', '承接期待', '循环嵌套期待']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('nested_loop_rules')
    expect(warnReport.next_actions.join('；')).toContain('setup -> escalation -> payoff -> carry_over')
    expect(warnReport.next_actions.join('；')).toContain('小循环 -> 中循环 -> 大循环')
  })

  test('reads story loop sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 27,
      chapter_no: 27,
      title: '旧印背名',
      raw_payload: {
        preDraftBrief: {
          storyLoopContract: {
            setup: '旧印章背面露出第二个证人的名字',
            escalation: '执事抢先派人封住证人住处',
            payoff: '沈砚用账册编号反锁执事封门时间',
            carryOver: '第二个证人留下赤炉城矿脉账册线索',
            nestedLoopRules: [
              '小循环 -> 中循环 -> 大循环必须同时可见。',
              '小循环中必须铺垫大循环的期待。',
            ],
            qualityChecks: ['本章必须形成 setup -> escalation -> payoff -> carry_over。'],
          },
        },
      },
    }

    const report = buildStoryLoopSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 27, title: '旧印背名' } },
      '沈砚解释了一些旧账历史。众人听完后，事情进入下一阶段。',
    )

    expect(report.label).toContain('故事循环缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第二个证人')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['升级阻碍', '兑现反馈', '承接期待', '循环嵌套期待']))
    expect(report.quality_checks.join('｜')).toContain('setup -> escalation -> payoff -> carry_over')
  })

  test('checks oh-story map transition continuity after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 31, chapter_no: 31, title: '入赤炉城' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 31,
        story_loop_contract: {
          setup: '沈砚带着旧城税契进入赤炉城',
          escalation: '赤炉城铸堂新规要求外来者先交炼炉保',
          payoff: '沈砚用旧城税契换到第一块炉牌',
          carry_over: '炉牌背面指向赤炉城上层矿脉账册',
          map_transition_rules: [
            '换地图前旧地图核心冲突至少阶段性解决。',
            '新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突。',
            '换地图后前5章必须快速建立新的代入感和期待感。',
            '保留至少一条贯穿主线，不能旧角色一刀切全部抛弃。',
            '新设定不能一次性全部倒出，每次换地图循环要升级。',
          ],
          nested_loop_rules: ['多级嵌套：小循环 -> 中循环 -> 大循环。'],
        },
      },
    }
    const transitionText = [
      '旧城账册案已阶段性收束，沈砚带着旧城税契和证人阿洛入赤炉城。',
      '赤炉城不是旧城的换名：城门外是炉烟和矿车，新角色铸堂掌炉人挡路，新规则要求外来者先交炼炉保。',
      '沈砚的新目标是拿到第一块炉牌，新的冲突是上层矿脉账册被赤炉城地头蛇扣住。',
      '这条税契主线继续牵住旧城黑账，阿洛作为旧日关系线跟来作证。',
      '去赤炉城前，阿洛先收到旧城证人来信，旧日关系线先动起来，主角才决定带着税契进城。',
      '前五章目标被明确成炉牌、矿脉账册和掌炉人试炼，赤炉城的更高门槛和更强对手已经压到眼前。',
      '新规只露出炼炉保和炉牌两项，没有把整座赤炉城设定一次性倒完。',
    ].join('\n')
    const brokenText = [
      '沈砚突然来到赤炉城。',
      '这里很大，设定很多，作者介绍了所有宗门、矿脉、炉法和历史。',
      '旧城的人和事全部不再提，旧目标结束了。',
      '他逛了一圈，准备开始新的生活。',
    ].join('\n')

    const okReport = buildStoryLoopSyncReport(project, chapter, contextPackage, transitionText)
    const warnReport = buildStoryLoopSyncReport(project, chapter, contextPackage, brokenText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('换地图承接')
    expect(okReport.missed.map((item: any) => item.key)).not.toContain('map_transition_rules')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('map_transition_rules')
    expect(warnReport.missed.find((item: any) => item.key === 'map_transition_rules')?.missed_items).toEqual(expect.arrayContaining([
      '旧地图核心冲突未阶段性解决',
      '新地图五件套不足',
      '缺贯穿主线或旧关系承接',
      '缺人际关系先行铺垫',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('换地图承接')
  })

  test('story state sync persists a story_loop_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyLoopSync, reviewType: 'story_loop_sync'")
    expect(source).toContain('buildStoryLoopSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.story_loop_sync = storyLoopSync')
  })

  test('checks oh-story information flow after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        information_flow_contract: {
          version: 'oh_story_information_flow_v1',
          scene_information_units: [
            '旧账册来源被质疑',
            '证人被执事逼迫改口',
            '旧印章证明账册被调换',
          ],
          reveal_order: [
            '先让执事压旧账册',
            '再让证人改口',
            '最后亮旧印章',
          ],
          suspense_responses: ['旧印章背面还有第二个证人'],
          transition_compression_rules: [
            '过渡不是填充，没有信息量就删掉。',
            '纯移动、寒暄、环境描写没有信息量时直接跳过或压缩。',
          ],
          no_infodump_guardrails: ['信息必须随审问冲突释放，不写背景说明书。'],
          quality_checks: ['每个信息团必须能一句话概括，并随冲突递进。'],
        },
      },
    }
    const flowText = [
      '执事先压旧账册，把账册来源当众质疑，逼沈砚认罪。',
      '证人被执事逼迫改口，审问冲突随之升级。',
      '沈砚没有解释背景，只在众人逼问最紧时最后亮旧印章。',
      '旧印章证明账册被调换，旧印章背面还有第二个证人的名字。',
      '去审判庭的路程被一句带过，过渡不是填充，纯移动和寒暄直接跳过。',
    ].join('\n')
    const flatText = [
      '阵堂账册制度分为内账、外账和执事账三类，每类都有漫长历史和不同权限。',
      '两人走过长廊，看了窗外天气，又互相寒暄了几句。',
      '沈砚解释了很多背景，大家终于明白规则。事情进入下一阶段。',
    ].join('\n')

    const okReport = buildInformationFlowSyncReport(project, chapter, contextPackage, flowText)
    const warnReport = buildInformationFlowSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('信息流 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息团', '揭示顺序', '悬念回应', '过渡压缩']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('信息流缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息团', '揭示顺序', '悬念回应', '过渡压缩', '背景说明书']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('transition_compression_rules')
    expect(warnReport.next_actions.join('；')).toContain('信息随冲突释放')
  })

  test('checks next objective after gain in oh-story information flow sync', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 18, chapter_no: 18, title: '筑基新门' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        information_flow_contract: {
          version: 'oh_story_information_flow_v1',
          scene_information_units: ['沈砚突破筑基', '内门令牌指向禁库试炼'],
          next_objective_rules: [
            '每次实力、身份、资源或阶段性目标提升后，必须立即引入新的挑战、目标、代价或更高门槛。',
            '兑现当前信息或胜利后，下一步干什么要在场景内可见，不能只写事情进入下一阶段。',
          ],
          transition_compression_rules: ['过渡不是填充，没有信息量就删掉。'],
          quality_checks: ['提升后立刻给出下一目标，避免主角变强但下一步干什么不清楚。'],
        },
      },
    }
    const okText = [
      '沈砚突破筑基，内门令牌当场亮起。',
      '执事没有让欢呼落地，立刻把禁库试炼的新目标压到他面前：三日内取回残阵核心，否则筑基资格作废。',
      '突破后的下一步目标、三日期限和更高门槛同时落进场景。',
    ].join('\n')
    const vacuumText = [
      '沈砚终于突破筑基，众人欢呼许久。',
      '他收起灵力，事情进入下一阶段。',
      '众人散去，他暂时没有新的目标。',
    ].join('\n')

    const okReport = buildInformationFlowSyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildInformationFlowSyncReport(project, chapter, contextPackage, vacuumText)

    expect(okReport.delivered.map((item: any) => item.key)).toContain('next_objective_after_gain')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('next_objective_after_gain')
    expect(warnReport.missed.find((item: any) => item.key === 'next_objective_after_gain')?.label).toBe('提升后下一目标')
    expect(warnReport.next_actions.join('；')).toContain('提升后')
  })

  test('reads information flow sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 26,
      chapter_no: 26,
      title: '旧账缺页',
      raw_payload: {
        preDraftBrief: {
          informationFlowContract: {
            sceneInformationUnits: ['旧账缺页被质疑', '证人被执事逼迫改口', '空白账页证明编号被调换'],
            revealOrder: ['先让执事压旧账缺页', '再让证人改口', '最后亮空白账页'],
            suspenseResponses: ['空白账页背面还有禁库编号'],
            transitionCompressionRules: ['过渡不是填充，没有信息量就删掉。'],
            noInfodumpGuardrails: ['信息必须随审问冲突释放，不写背景说明书。'],
            qualityChecks: ['每个信息团必须能一句话概括。'],
          },
        },
      },
    }

    const report = buildInformationFlowSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 26, title: '旧账缺页' } },
      '旧账制度有很多历史，众人走过长廊，又互相寒暄。事情进入下一阶段。',
    )

    expect(report.label).toContain('信息流缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息团', '过渡压缩', '背景说明书']))
    expect(report.quality_checks.join('｜')).toContain('每个信息团必须能一句话概括')
  })

  test('story state sync persists an information_flow_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: informationFlowSync, reviewType: 'information_flow_sync'")
    expect(source).toContain('buildInformationFlowSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.information_flow_sync = informationFlowSync')
  })

  test('checks oh-story expectation threshold after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        expectation_threshold_contract: {
          version: 'oh_story_expectation_threshold_v1',
          short_expectation: '沈砚先拿到审判庭行动资格',
          medium_expectations: ['公开验明旧印，证明旧账册被调换'],
          long_expectations: ['幕后长老为什么放任主角进入内层', '父亲旧案还有第三个证人'],
          thresholds: ['气血达标', '公开验明旧印', '独自取回阵牌'],
          dynamic_thresholds: ['公开验印会暴露父亲线索'],
          nested_units: ['拿到资格前先露出第三个证人的名字'],
          expectation_before_payoff_rules: [
            '期待感 > 爽点：铺垫的篇幅不少于释放的篇幅。',
            '爽点到来前一刻是张力最高处，不要提前泄气。',
          ],
          quality_checks: ['两长一短必须同时在线。'],
        },
      },
    }
    const thresholdText = [
      '沈砚先拿到审判庭行动资格，但气血达标只是第一道门槛。',
      '执事要求他公开验明旧印，他又必须独自取回阵牌。',
      '公开验明旧印会暴露父亲线索，证明旧账册被调换也会牵出幕后长老为什么放任主角进入内层。',
      '期待感大于爽点：他没有立刻兑现反证，而是先用三段铺垫拉长需求，让资格、旧印和第三个证人逐层压到释放前一刻。',
      '资格到手之前，旧印章背面先露出第三个证人的名字，父亲旧案还有第三个证人的长期期待没有断。',
    ].join('\n')
    const flatText = [
      '沈砚解释清楚账册问题，很快拿到资格。',
      '执事不再阻拦，众人都点头认可。',
      '没有期待铺垫，爽点立刻释放，读者还没开始等就结束了。',
      '当前目标顺利完成，事情结束。',
    ].join('\n')

    const okReport = buildExpectationThresholdSyncReport(project, chapter, contextPackage, thresholdText)
    const warnReport = buildExpectationThresholdSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('期待阈值 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['两长一短', '门槛拆分', '动态加码', '期待大于爽点', '下一开环']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('期待阈值缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['两长一短', '门槛拆分', '动态加码', '期待大于爽点', '下一开环']))
    expect(warnReport.next_actions.join('；')).toContain('两长一短')
    expect(warnReport.next_actions.join('；')).toContain('期待感')
  })

  test('reads expectation threshold sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 28,
      chapter_no: 28,
      title: '矿账新门',
      raw_payload: {
        preDraftBrief: {
          expectationThresholdContract: {
            shortExpectation: '沈砚先找到赤炉城矿脉账册入口',
            mediumExpectations: ['矿脉账册会证明执事封门时间造假'],
            longExpectations: ['赤炉城矿脉账册背后还有上层供奉'],
            thresholds: ['拿到炉牌', '找到矿账入口', '避开封门追捕'],
            dynamicThresholds: ['找到矿账入口后必须面对上层供奉审查'],
            expectationBeforePayoffRules: ['期待感 > 爽点：先拉长矿账入口门槛，再兑现证据反转。'],
            nextOpenLoop: '赤炉城矿脉账册背面出现供奉私印',
            qualityChecks: ['两长一短和下一开环必须同时在线。'],
          },
        },
      },
    }

    const report = buildExpectationThresholdSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 28, title: '矿账新门' } },
      '沈砚当场解决麻烦。众人点头散去。没有期待铺垫，爽点立刻释放，新的目标没有出现，事情到这里结束。',
    )

    expect(report.label).toContain('期待阈值缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉城矿脉账册')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['两长一短', '动态加码', '期待大于爽点', '下一开环']))
    expect(report.quality_checks.join('｜')).toContain('两长一短和下一开环')
  })

  test('checks three expectation lines after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 13, chapter_no: 13, title: '旧印新门' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        expectation_threshold_contract: {
          version: 'oh_story_expectation_threshold_v1',
          three_expectation_lines: {
            plot_expectation: '旧账册被调换背后是谁在操盘。',
            theme_payoff: '沈砚用证据反杀执事，继续兑现证据流反转甜头。',
            freshness_hook: '旧印验明时会暴露父亲线索，把普通审判变成血缘旧案。',
          },
        },
      },
    }
    const okText = [
      '沈砚没有急着解释，他盯着旧账册缺页，问旧账册被调换背后是谁在操盘。',
      '执事逼他认错时，沈砚拿出第二枚旧印，用证据反杀执事，继续兑现证据流反转甜头。',
      '旧印验明时会暴露父亲线索，这场普通审判突然变成血缘旧案，所有人都意识到门后还有新东西。',
    ].join('\n')
    const staleText = [
      '沈砚查清旧账册被调换背后是谁在操盘。',
      '执事逼他认错时，沈砚拿出第二枚旧印，用证据反杀执事，继续兑现证据流反转甜头。',
      '众人点头，审判结束。',
    ].join('\n')

    const okReport = buildExpectationThresholdSyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildExpectationThresholdSyncReport(project, chapter, contextPackage, staleText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.key)).toContain('three_expectation_lines')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('three_expectation_lines')
    expect(warnReport.missed.find((item: any) => item.key === 'three_expectation_lines')?.label).toBe('三种期待线')
    expect(warnReport.next_actions.join('；')).toContain('剧情期待 + 主题甜头 + 新鲜感')
  })

  test('story state sync persists an expectation_threshold_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'expectation_threshold_sync'")
    expect(source).toContain("payloadKey: 'expectation_threshold_sync'")
    expect(source).toContain('buildExpectationThresholdSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.expectation_threshold_sync = expectationThresholdSync')
  })

  test('checks oh-story emotional arc after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        emotional_arc_contract: {
          version: 'oh_story_emotional_arc_v1',
          emotion_formula: '平静 -> 调动 -> 释放 -> 爽',
          arc_shape: '递进形',
          scene_emotion_steps: [
            '调动：旧账册当众压罪，制造压迫和不该如此',
            '释放：沈砚用旧印章反证，执事改口，全场态度转变',
          ],
          pressure_methods: ['公开升级：把私下伤害搬到公开场合。'],
          payoff_types: ['目标达成', '态度转变'],
          payoff_escalation_rules: [
            '影响范围：个人 -> 群体 -> 社会',
            '揭示深度：表象 -> 本质 -> 颠覆',
            '身份落差：路人 -> 大佬 -> 全场震惊',
          ],
          payoff_reverse_design: {
            design_order: [
              '先确定用什么方式让读者满足（爽点类型）。',
              '再设计如何拉起期待（期待点）。',
              '最后设计如何铺垫（铺垫）。',
            ],
            quality_checks: ['章纲必须按爽点类型 -> 期待点 -> 铺垫倒推。'],
          },
          payoff_tier_rules: [
            '日常小装逼：距离下个大爽点远时，用日常优势维持读者耐心。',
            '核心爽点：必须切在主线上，围绕主线目标装逼。',
            '偏离爽点：背离主线去别处装逼，必须避免。',
          ],
          payoff_density_rules: [
            '不要拉长单个爽点的铺垫，而是多想几个爽点。',
            '每 800-1200 字至少交付一次信息增量、能力展示、危机反制、关系变化或小回收。',
          ],
          emotion_module_recomposition_rules: [
            '戏剧性会磨损，情绪不会磨损；同一种爽感可以重复，但不能重复同一个戏剧单元。',
            '套路重复时必须至少换场景、换对手、加新情绪、提高 stakes/奖励复杂度之一。',
          ],
          expectation_rules: ['断期待禁止：下一个期待立起来之前，不能结束当前期待。'],
          safety_rules: ['下行情节中必须给读者看见底牌或潜在解法。'],
          quality_checks: ['调动、释放和爽感都必须有正文证据。'],
        },
      },
    }
    const arcText = [
      '旧账册当众压罪，沈砚先被迫承压，旁观弟子都觉得这不该如此。',
      '他没有争辩，只按住袖口里的旧印章，让读者看见底牌和潜在解法。',
      '执事继续公开升级压迫，逼他认罪。',
      '沈砚最后用旧印章反证账册被调换，执事当众改口，全场态度转变。',
      '这一段章纲按爽点倒推：先确定爽点类型是目标达成和态度转变，再用旧账册压罪拉起期待点，最后把旧印章、袖口底牌和公开审判铺垫到释放前。',
      '这次核心爽点切在主线目标上：反证旧账、拿回审判资格；日常小装逼只用一句旧印章辨伪维持耐心，没有离开主线去别处装逼。',
      '铺垫没有只拖一个大爽点：第一段确认旧账册墨色异常形成信息增量，第二段用袖口底牌反制执事催认罪，第三段林青禾公开站到他身侧带来关系变化，最后才反证旧账完成大爽点。',
      '这一次递增先从个人洗清冤屈，扩散到全场弟子改口，再逼宗门长老公开承认旧案牵连整座审判庭；揭示深度也从账册表象推进到账房本质黑幕，最后颠覆执事身份。',
      '这次仍然使用当众打脸的情绪模块，但没有重复同一个戏剧单元：场景从酒楼换到审判庭，对手从路人换成执事，新增“旧案牵连师门”的愧疚情绪，stakes 从个人清白提高到审判资格和宗门规则。',
      '场景1标注为调动/前反应，让读者提前知道旧账册压罪的坏结果；场景2标注为复现，执事逼认罪让坏结果真的发生；场景3标注为后反应/释放，沈砚作出改变并追查第二个证人，下一开环同时开启。',
      '下行情节中读者一直看得见底牌或潜在解法：旧印章、袖口暗牌和账册墨色都在反击前露过面。',
      '目标达成后，旧印章背面露出第二个证人的名字，新的期待立起来。',
      '下一个期待立起来之前，当前期待没有被散场打断。',
    ].join('\n')
    const flatText = [
      '沈砚很压抑，也很痛苦。',
      '众人说了几句，场面停住。',
      '他离开审判庭去酒楼随手打脸路人，和旧账主线无关。',
      '接下来一千多字都在反复铺垫同一个大爽点，作者拉长单个爽点的铺垫，读者没有新的信息增量、能力展示、危机反制、关系变化或小回收。',
      '本章继续重复同一个英雄救美打脸模板，还是同样结构，没有换场景、没有换对手、没有新情绪，stakes 和奖励也没有变化。',
      '直到最后他才忽然赢了，众人还是震惊。',
      '最后事情暂时结束，大家都散了。',
    ].join('\n')

    const okReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, arcText)
    const warnReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('情绪弧 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪公式', '调动释放', '爽点倒推法', '装逼层级', '多爽点密度', '情绪模块重组', '爽点递增对比', '场景情绪执行', '下行情节安全感']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('情绪弧缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪公式', '调动释放', '爽点倒推法', '装逼层级', '多爽点密度', '情绪模块重组', '爽点递增对比', '下行情节安全感']))
    expect(warnReport.missed.find((item: any) => item.key === 'emotion_module_recomposition_rules')?.missed_items).toEqual(expect.arrayContaining([
      '重复戏剧单元没有换场景/对手/新情绪/stakes',
    ]))
    expect(warnReport.missed.find((item: any) => item.key === 'payoff_density_rules')?.repair_instruction).toContain('多想几个爽点')
    expect(warnReport.missed.find((item: any) => item.key === 'payoff_tier_rules')?.missed_items).toEqual(expect.arrayContaining([
      '缺核心爽点服务主线目标',
      '偏离爽点背离主线',
    ]))
    expect(warnReport.missed.find((item: any) => item.key === 'payoff_reverse_design')?.missed_items).toEqual(expect.arrayContaining([
      '缺期待点设计',
      '缺铺垫 -> 期待升高 -> 爽点释放链条',
    ]))
    expect(warnReport.missed.find((item: any) => item.key === 'payoff_escalation_rules')?.repair_instruction).toContain('影响范围')
    expect(warnReport.next_actions.join('；')).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(warnReport.next_actions.join('；')).toContain('换场景/换对手/加新情绪')
    expect(warnReport.next_actions.join('；')).toContain('影响范围')
  })

  test('checks oh-story plot emotion formulas after delivery', () => {
    const project = { title: '维修订单系统' }
    const chapter = { id: 33, chapter_no: 33, title: '停业单反杀' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 33,
        emotional_arc_contract: {
          version: 'oh_story_emotional_arc_v1',
          progressive_confrontation_rules: [
            '递进对抗写法：主角与反派是角力而非碾压。',
            '每次小角力主角稍占上风，反派继续加码，最后主角王炸一锤定音。',
          ],
          meme_plot_formula_rules: [
            '以梗构建剧情法：发生 -> 发展 -> 转折 -> 高潮。',
            '用梗作为高潮点倒推剧情，避免流水账。',
          ],
          reader_desire_formula_rules: [
            '驱动读者欲望四步公式：生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿。',
            '困境层级层层递进，解决方式也要多样。',
          ],
          quality_checks: ['递进对抗、梗四段式和读者欲望四步公式都必须有正文证据。'],
        },
      },
    }
    const formulaText = [
      '这一章的递进对抗不是一路碾压，而是角力而非碾压：第一轮主角只用检测笔小胜，会长马上加码拿出停业单，第二轮主角用客户记录顶住压力，最后才用备份订单王炸一锤定音。',
      '梗四段式完整落地：发生是协会停业单压到门口，发展是客户不断撤单和围观维修师误判，转折是系统订单记录反向证明会长造假，高潮是主角公开备份记录让协会当场改口。',
      '读者欲望四步公式也跑完：先生产诉求，让读者看见失业维修师被强权停业的不公；再给予希望，检测笔和备份订单提前露面；中段努力解决，主角逐项核对客户记录；最后得偿所愿，停业单作废、客户恢复授权，并抛出医院备用电源的新困境。',
    ].join('\n')
    const flatText = [
      '会长拿出停业单，主角立刻打开系统赢了。',
      '众人都震惊，协会也认错。',
      '事情结束，主角回家休息。',
    ].join('\n')

    const okReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, formulaText)
    const warnReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['递进对抗', '梗四段式', '读者欲望四步公式']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['递进对抗', '梗四段式', '读者欲望四步公式']))
    expect(warnReport.next_actions.join('；')).toContain('角力而非碾压')
    expect(warnReport.next_actions.join('；')).toContain('发生 -> 发展 -> 转折 -> 高潮')
    expect(warnReport.next_actions.join('；')).toContain('生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿')
  })

  test('flags emotional turning self-claims when no triggering event is visible', () => {
    const project = { title: '长夜账本' }
    const chapter = { id: 88, chapter_no: 88, title: '忽然释然' }
    const contextPackage = {
      chapter_target: {
        emotional_arc_contract: {
          version: 'oh_story_emotional_arc_v1',
          source: 'manual',
          emotional_turning_rules: [
            '每 3-5 个小节有一次情绪转向，不能一路虐到底或一路爽到底。',
            '每次情绪转向都必须由事件触发，不能无理由从愤怒跳到释然、从压迫跳到爽感。',
          ],
          failure_mode_guards: ['太平：连续 5+ 小节没有情绪转折时，必须插入意外事件或新信息。'],
          quality_checks: ['情绪转向必须有触发事件证据。'],
        },
      },
    }
    const selfClaimText = [
      '沈砚一直很压抑，众人也一直沉默。',
      '本章每 3-5 个小节有一次情绪转向，他从愤怒变成释然，从压迫跳到爽感。',
      '但现场没有新证据、没有新动作、没有新代价，也没有任何人改口。',
      '他只是忽然觉得想开了，气氛突然变好。',
    ].join('\n')
    const triggeredText = [
      '沈砚一直被执事逼认罪，怒意压在喉间。',
      '账房忽然递出第二份账册，缺页上的尾号和执事袖口墨痕对上。',
      '这个新证据触发情绪转向：他从压迫里的愤怒转成冷静反击。',
      '执事当众改口，旁观者站到沈砚身侧，爽感由事件释放出来。',
    ].join('\n')

    const warnReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, selfClaimText)
    const okReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, triggeredText)

    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.find((item: any) => item.key === 'emotional_turning_rules')?.label).toBe('情绪转向')
    expect(warnReport.missed.find((item: any) => item.key === 'emotional_turning_rules')?.repair_instruction).toContain('事件触发')
    expect(warnReport.missed.find((item: any) => item.key === 'emotional_turning_rules')?.repair_instruction).toContain('新证据')
    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.find((item: any) => item.key === 'emotional_turning_rules')?.evidence.join('｜')).toContain('事件触发')
  })

  test('checks emotional arc scene execution and expectation relay after delivery', () => {
    const project = { title: '长夜账本' }
    const chapter = { id: 91, chapter_no: 91, title: '血书回声' }
    const contextPackage = {
      chapter_target: {
        emotional_arc_contract: {
          version: 'oh_story_emotional_arc_v1',
          scene_execution_rules: [
            '每个场景必须标注读者当前情绪阶段：调动、复现、释放或后反应。',
            '虐/悲壮/遗憾场景必须按前反应 -> 复现 -> 后反应执行。',
            '闭环当前期待时必须同时开启下一开环。',
          ],
          reaction_structure_rules: [
            '前反应：让读者提前知道坏结果。',
            '复现：让坏结果真的发生。',
            '后反应：主角真情流露并作出改变。',
          ],
          expectation_rules: ['闭环一个期待时，必须同时开启新的期待或更大问题。'],
          quality_checks: ['场景卡和正文必须能对应调动、复现、后反应、下一开环。'],
        },
      },
    }
    const okText = [
      '场景1标注为调动/前反应：读者提前知道坏结果，血书压在门缝里，妹妹还在笑着收拾旧名牌。',
      '场景2标注为复现：坏结果真的发生，旧名牌被当众摔碎，压迫从预知落到现场。',
      '场景3标注为后反应/释放：主角真情流露，把碎片收进掌心，作出改变，决定查第三个证人。',
      '当前期待闭环为旧名牌真相，章尾同时开启下一开环：第三个证人为什么知道血书背面的名字。',
    ].join('\n')
    const flatText = [
      '主角很难过，妹妹也很难过。',
      '坏事发生了，大家沉默。',
      '最后他觉得应该振作，事情暂时结束。',
    ].join('\n')

    const okReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.delivered.map((item: any) => item.key)).toContain('scene_execution_rules')
    expect(okReport.delivered.find((item: any) => item.key === 'scene_execution_rules')?.evidence.join('｜')).toContain('下一开环')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.find((item: any) => item.key === 'scene_execution_rules')?.label).toBe('场景情绪执行')
    expect(warnReport.missed.find((item: any) => item.key === 'scene_execution_rules')?.missed_items).toEqual(expect.arrayContaining([
      '缺场景情绪阶段标注',
      '缺前反应-复现-后反应链条',
      '缺闭环期待后的下一开环',
    ]))
    expect(warnReport.priority_repair).toBe('优先补场景情绪执行')
    expect(warnReport.next_actions.join('；')).toContain('每个场景标注调动/复现/释放/后反应')
  })

  test('reads emotional arc sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 29,
      chapter_no: 29,
      title: '封门反压',
      raw_payload: {
        preDraftBrief: {
          emotionalArcContract: {
            emotionFormula: '压迫 -> 反压 -> 公开释放 -> 新期待',
            sceneEmotionSteps: ['执事封门制造压迫', '沈砚用矿账编号反压', '众人公开改口释放爽感'],
            payoffTypes: ['公开改口', '证据反压'],
            payoffEscalationRules: ['影响范围：院内 -> 审判庭 -> 赤炉城矿堂'],
            safetyRules: ['封门下压时必须露出矿账编号这张底牌。'],
            qualityChecks: ['压迫、反压和公开释放必须都有正文证据。'],
          },
        },
      },
    }

    const report = buildEmotionalArcSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 29, title: '封门反压' } },
      '沈砚觉得很难受。众人沉默。事情慢慢结束。',
    )

    expect(report.label).toContain('情绪弧缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账编号')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪公式', '调动释放', '下行情节安全感']))
    expect(report.quality_checks.join('｜')).toContain('压迫、反压和公开释放')
  })

  test('story state sync persists an emotional_arc_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'suspense_sync'")
    expect(source).toContain("payloadKey: 'suspense_sync'")
    expect(source).toContain('buildSuspenseSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.suspense_sync = suspenseSync')
  })

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'showdown_sync'")
    expect(source).toContain("payloadKey: 'showdown_sync'")
    expect(source).toContain('buildShowdownSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.showdown_sync = showdownSync')
  })

  test('story state sync persists a spectator_reaction_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: spectatorReactionSync, reviewType: 'spectator_reaction_sync'")
    expect(source).toContain('buildSpectatorReactionSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.spectator_reaction_sync = spectatorReactionSync')
  })

  test('story state sync persists a payoff_setup_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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

  test('reads character behavior sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 41,
      chapter_no: 41,
      title: '旧印动机',
      raw_payload: {
        preDraftBrief: {
          characterBehaviorContract: {
            motivationChain: ['赤炉旧印动机链：沈砚为保住矿账证人，必须冒险当众验印。'],
            layeredTags: ['身份标签：旧城证人；表现标签：冷静反锁；内核标签：不再替别人背账。'],
            behaviorRules: ['沈砚必须用验印动作展示选择，而不是口头解释成长。'],
            memoryAnchors: ['沈砚每次判断前都会按住旧印缺口。'],
            qualityChecks: ['旧印动机、验印动作和按住旧印缺口必须同时可见。'],
          },
        },
      },
    }

    const report = buildCharacterBehaviorSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 41, title: '旧印动机' } },
      '沈砚突然决定帮忙。他解释自己已经成长，众人听完后表示理解。',
    )

    expect(report.label).toContain('角色行为缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉旧印动机链')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('旧印缺口')
    expect(report.quality_checks.join('｜')).toContain('验印动作')
  })

  test('reads asset linkage sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 42,
      chapter_no: 42,
      title: '炉牌归属',
      raw_payload: {
        preDraftBrief: {
          assetLinkageContract: {
            keyAssets: ['赤炉炉牌', '第七号矿账封条'],
            linkagePlan: ['赤炉炉牌必须推进入城目标，第七号矿账封条必须制造守门阻碍。'],
            stateTracking: ['赤炉炉牌从未登记变为临时归属沈砚。'],
            threeAppearancePlan: ['炉牌第一次拦门，第二次验印，第三次打开供奉私印线索。'],
            qualityChecks: ['赤炉炉牌和第七号矿账封条都必须绑定目标、阻碍和章尾钩子。'],
          },
        },
      },
    }

    const report = buildAssetLinkageSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 42, title: '炉牌归属' } },
      '沈砚拿到一个东西。大家讨论了一会儿，事情解决。',
    )

    expect(report.label).toContain('资产挂钩缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉炉牌')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账封条')
    expect(report.quality_checks.join('｜')).toContain('章尾钩子')
  })

  test('reads state tracking sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 43,
      chapter_no: 43,
      title: '矿账状态',
      raw_payload: {
        preDraftBrief: {
          stateTrackingContract: {
            characterStates: ['沈砚当前状态：持有未登记赤炉炉牌，但身份仍被守门人质疑。'],
            historicalCausality: ['上一章赤炉封条被调换，所以本章必须追问第七号矿账来源。'],
            worldConstraints: ['赤炉城规则：未登记炉牌不能直接进入矿堂内库。'],
            filterRules: ['只带入会影响本章验印选择的状态，不写百科背景。'],
            qualityChecks: ['未登记炉牌、封条调换和内库限制必须影响本章行动。'],
          },
        },
      },
    }

    const report = buildStateTrackingSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 43, title: '矿账状态' } },
      '沈砚进入矿堂。背景很多，规则很多，大家等待后续再处理。',
    )

    expect(report.label).toContain('状态跟踪缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('未登记赤炉炉牌')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账来源')
    expect(report.quality_checks.join('｜')).toContain('内库限制')
  })

  test('reads intent confirmation sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 44,
      chapter_no: 44,
      title: '反锁意图',
      raw_payload: {
        preDraftBrief: {
          intentConfirmationContract: {
            confirmedIntent: '本章意图：用第七号矿账封条反锁守门人的解释权。',
            rhythmAndStyle: ['蓄势三段后短句爆发，再用账房反应冷却。'],
            structureInputs: ['代价/收益：公开得罪守门人，但夺回矿账解释权。', '章尾承接：供奉私印来源变成下一问。'],
            executionFocus: ['信息差反应：账房、守门人、旁观矿工必须有差异化反应。'],
            qualityChecks: ['反锁解释权、公开得罪守门人和供奉私印下一问必须同时可见。'],
          },
        },
      },
    }

    const report = buildIntentConfirmationSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 44, title: '反锁意图' } },
      '大家讨论很久，事情就解决了。本章只是过渡，之后再说。',
    )

    expect(report.label).toContain('意图确认缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账封条')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.quality_checks.join('｜')).toContain('反锁解释权')
  })

  test('reads continuity heat sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 45,
      chapter_no: 45,
      title: '热度接力',
      raw_payload: {
        preDraftBrief: {
          continuityHeatContract: {
            heatStates: ['hot：第七号矿账封条必须继续施压', 'warm：赤炉炉牌归属要触达一次', 'cold：镜中供奉私印只能升温不能揭完'],
            activeExpectations: ['读者正在等第七号矿账封条来源'],
            watchItems: ['赤炉炉牌归属', '镜中供奉私印'],
            dormantAllowed: ['旧城外账名单本章允许休眠'],
            qualityChecks: ['hot 封条、warm 炉牌和 cold 私印必须有热度层级。'],
          },
        },
      },
    }

    const report = buildContinuityHeatSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 45, title: '热度接力' } },
      '沈砚处理新事情。旧线索没有再提，事情继续发展。',
    )

    expect(report.label).toContain('连续性热度缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账封条')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('镜中供奉私印')
    expect(report.quality_checks.join('｜')).toContain('热度层级')
  })

  test('reads conflict structure sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 46,
      chapter_no: 46,
      title: '封门冲突',
      raw_payload: {
        preDraftBrief: {
          conflictStructureContract: {
            conflictLadder: ['封门冲突必须从言语压迫升级到炉牌扣押，再升级到内库资格判定。'],
            motivationSources: ['世界背景：赤炉城登记规则阻止沈砚进入矿堂。'],
            antagonistPressureRules: ['守门人用登记规则压势，不只站桩嘲讽。'],
            protagonistAgencyRules: ['沈砚必须用第七号封条做别人想不到的反锁。'],
            nextConflictSeeds: ['章尾留下供奉私印是谁盖的下一冲突。'],
            qualityChecks: ['封门冲突必须有升级阶梯、登记规则压势和供奉私印种子。'],
          },
        },
      },
    }

    const report = buildConflictStructureSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 46, title: '封门冲突' } },
      '沈砚和守门人争了几句。守门人让开，事情结束。',
    )

    expect(report.label).toContain('冲突结构缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('炉牌扣押')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号封条')
    expect(report.quality_checks.join('｜')).toContain('供奉私印种子')
  })

  test('reads upgrade rhythm sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 47,
      chapter_no: 47,
      title: '旧印升级',
      raw_payload: {
        preDraftBrief: {
          upgradeRhythmContract: {
            upgradeGap: ['升级前缺口：旧印只能验普通账册，无法识别供奉私印。'],
            upgradeGainPlan: ['升级后获得赤炉私印识别能力，但只能识别一次。'],
            feedbackLoop: ['验出私印 -> 众人反应 -> 解锁一次性识别反馈 -> 留下更高门槛。'],
            emotionModules: ['点石成金：不起眼旧印验出供奉私印价值。'],
            qualityChecks: ['旧印升级必须有缺口、一次性识别反馈和更高门槛。'],
          },
        },
      },
    }

    const report = buildUpgradeRhythmSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 47, title: '旧印升级' } },
      '沈砚忽然变强，直接解决了所有问题，没有新门槛。',
    )

    expect(report.label).toContain('升级节奏缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('一次性识别')
    expect(report.quality_checks.join('｜')).toContain('更高门槛')
  })

  test('reads target reader sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 48,
      chapter_no: 48,
      title: '读者回报',
      raw_payload: {
        preDraftBrief: {
          targetReaderContract: {
            readerProfile: '目标读者：喜欢规则反制、证据流打脸和短周期追更回报的男频读者。',
            readerDesires: ['想看沈砚用第七号封条移除不公平登记规则。'],
            emotionalGapAnalysis: ['核心痛苦：被规则压着走；未满足需求：亲手拿回解释权。'],
            chapterAttractions: ['第七号封条当场反制守门人，章尾挂供奉私印。'],
            qualityChecks: ['目标读者必须看到规则反制、解释权回收和供奉私印期待。'],
          },
        },
      },
    }

    const report = buildTargetReaderSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 48, title: '读者回报' } },
      '作者觉得这个世界观很有意思。读者会喜欢。主要展示设定，没有明显回报。',
    )

    expect(report.label).toContain('目标读者缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('规则反制')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.quality_checks.join('｜')).toContain('解释权回收')
  })

  test('reads genre positioning sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 49,
      chapter_no: 49,
      title: '类型承诺',
      raw_payload: {
        preDraftBrief: {
          genrePositioningContract: {
            genreLabel: '证据流玄幻升级文',
            readerPsychology: ['读者要看到寒门主角用证据反制规则压迫。'],
            genreFormula: ['封条证据 -> 规则压迫 -> 旧印验证 -> 当场反打。'],
            coreHookRules: ['核心梗：旧印能验出矿账封条真伪。'],
            mustHaveScenes: ['必须有第七号封条验真场面。'],
            qualityChecks: ['证据流、旧印验真和规则反打必须三位一体。'],
          },
        },
      },
    }

    const report = buildGenrePositioningSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 49, title: '类型承诺' } },
      '这一章忽然写成古风权谋闲谈。没有旧印，没有验真，也没有规则反打。',
    )

    expect(report.label).toContain('题材定位缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('证据流玄幻升级文')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号封条验真')
    expect(report.quality_checks.join('｜')).toContain('三位一体')
  })

  test('reads female audience sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '换亲账本', genre: '女频宅斗' }
    const chapter = {
      id: 50,
      chapter_no: 50,
      title: '账本退路',
      raw_payload: {
        preDraftBrief: {
          femaleAudienceContract: {
            corePrinciples: ['安全感：女主必须握住嫁妆账本退路。', '女主主动性：关键选择由女主亲自谈判。'],
            readerNeedRules: ['深层需求：女主被尊重，被珍视，而不是只被拯救。'],
            copyPromiseRules: ['状态 -> 困境 -> 行动 -> 成功：女主用账本条款拿回铺子。'],
            romanceAxisRules: ['感情升温必须踩在女主拿回铺子的成长节点上。'],
            qualityChecks: ['账本退路、亲自谈判和成长节点升温必须同时可见。'],
          },
        },
      },
    }

    const report = buildFemaleAudienceSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 50, title: '账本退路' } },
      '女主被安排着赢，关键选择都由男主安排。她一直被虐，没有退路。',
    )

    expect(report.label).toContain('女频长篇缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('嫁妆账本退路')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('亲自谈判')
    expect(report.quality_checks.join('｜')).toContain('成长节点升温')
  })

  test('reads plot dynamics sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 51,
      chapter_no: 51,
      title: '动力闭环',
      raw_payload: {
        preDraftBrief: {
          plotDynamicsContract: {
            plotLoop: ['目标：拿到第七号矿账封条', '阻碍：守门人扣押炉牌', '行动：沈砚当场验印', '代价/反馈：公开得罪守门人', '新期待：供奉私印来源'],
            climaxFormula: ['蓄能：守门人压规则', '假胜：炉牌看似被没收', '崩解：第七号封条反咬', '悬置收尾：供奉私印未解'],
            abOutline: ['A 蓄压：扣押炉牌', 'B 抬情绪：验印反制'],
            qualityChecks: ['剧情动力必须有第七号封条目标、炉牌阻碍、验印行动和供奉私印新期待。'],
          },
        },
      },
    }

    const report = buildPlotDynamicsSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 51, title: '动力闭环' } },
      '没有明确目标，没有真正阻碍，一路顺利解决。没有代价反馈，没有新期待。',
    )

    expect(report.label).toContain('剧情动力缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账封条')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('守门人扣押炉牌')
    expect(report.quality_checks.join('｜')).toContain('供奉私印新期待')
  })

  test('checks oh-story beat cooling after repeated conflict chapters', () => {
    const project = { title: '旧城账册' }
    const conflictChapter = { id: 151, chapter_no: 15, title: '第三次会审压迫' }
    const recentConflictContext = {
      chapter_target: {
        chapter_no: 15,
        beat_type: 'conflict_thrill',
        recent_chapter_beats: [
          { chapter_no: 11, beat_type: 'tension_escalation', label: '对手改规则' },
          { chapter_no: 12, beat_type: 'conflict_thrill', label: '会审开打' },
          { chapter_no: 13, beat_type: 'conflict_thrill', label: '执事压问' },
          { chapter_no: 14, beat_type: 'conflict_thrill', label: '长老翻案' },
        ],
      },
    }
    const rotatedChapter = { id: 152, chapter_no: 16, title: '账册余波' }
    const rotatedContext = {
      chapter_target: {
        chapter_no: 16,
        beat_type: 'bond_deepening',
        recent_chapter_beats: [
          { chapter_no: 12, beat_type: 'conflict_thrill', label: '会审开打' },
          { chapter_no: 13, beat_type: 'conflict_thrill', label: '执事压问' },
          { chapter_no: 14, beat_type: 'tension_escalation', label: '长老翻案' },
          { chapter_no: 15, beat_type: 'world_painting', label: '旧城账册规则展开' },
        ],
      },
    }

    const conflictReport = buildBeatCoolingSyncReport(project, conflictChapter, recentConflictContext, '沈砚第三次冲进会审厅，执事再次拔剑，长老席继续加压，所有人都被迫看这场大冲突。')
    const rotatedReport = buildBeatCoolingSyncReport(project, rotatedChapter, rotatedContext, '沈砚没有继续开打，而是和林青禾复盘旧城账册背后的地契规则。两人的信任关系推进，旧城税契世界观也被展开。')

    expect(conflictReport.status).toBe('warn')
    expect(conflictReport.priority_repair).toBe('优先轮换桥段类型')
    expect(conflictReport.missed.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'conflict_thrill_overrun',
      'five_chapter_texture_gap',
    ]))
    expect(conflictReport.next_actions.join('；')).toContain('关系深化')
    expect(rotatedReport.status).toBe('ok')
    expect(rotatedReport.missed_count).toBe(0)
  })

  test('story state sync persists a beat_cooling_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: beatCoolingSync, reviewType: 'beat_cooling_sync'")
    expect(source).toContain('buildBeatCoolingSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.beat_cooling_sync = beatCoolingSync')
  })

  test('checks opening contract protagonist entry, expectation point and foundations after delivery', () => {
    const project = { title: '规则妈妈们找上门' }
    const chapter = { id: 1, chapter_no: 1, title: '门外有三个妈妈' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        opening_contract: {
          version: 'oh_story_opening_v1',
          source: 'manual',
          activation_scope: '前3章强制执行。',
          opening_strategy: '危机开局',
          required_beats: [
            '300 字内主角登场，且带着危机、优势或陌生环境进入现场。',
            '1000 字内必须出现爽点或期待点。',
            '第一章必须说明：主角目标 + 本文卖点。',
          ],
          foundation_points: [
            '人设基点：展示主角核心性格和处境。',
            '切入点基点：主角遭遇第一个冲突。',
            '金手指基点：展示主角独特优势。',
          ],
          opening_plan: [
            '李岚把裁员信塞进口袋时，门外响起三道一模一样的敲门声。',
            '1000字内出现血缘系统和三位妈妈的反常身份。',
            '系统给出第一次检测。',
          ],
          five_essentials_rules: [
            '简单点：第一章交代谁/在哪里/有什么/为什么/要做什么。',
            '不能偏：开头剧情必须符合主线。',
            '要快：切入剧情速度要快。',
            '要爽：第一个小剧情必须有爽点。',
            '不能平：必须有冲突矛盾，不能平淡如水。',
          ],
          information_priority: ['危机感 > 人设 > 金手指暗示 > 世界观。'],
          forbidden_patterns: ['大段背景介绍', '天气/风景开头', '世界观详细解说'],
          quality_checks: ['主角登场、期待点和金手指基点都在正文早段兑现。'],
        },
      },
    }
    const openingText = [
      '李岚把裁员信塞进口袋时，门外响起三道一模一样的敲门声。',
      '房租催缴短信还亮在屏幕上，七天倒计时忽然跳出来：请在三位母亲中确认真正血缘，否则账户冻结。',
      '第一位女人递来认亲协议，第二位女人直接叫出他小时候的小名，第三位女人却拿着一张没有照片的出生证明。',
      '李岚的目标很清楚：先活过七天，再查清真正血缘；本文卖点就是普通失业中年被病娇妈妈和血缘系统同时拖进规则认亲局。',
      '系统给出第一次检测：第一位妈妈血缘匹配率为零。爽点和期待点同时落地，读者立刻想知道另外两位妈妈是真是假。',
      '他没有一次性解释世界观，只先确认裁员危机、三位妈妈、血缘系统和倒计时；更多规则留到下一章。',
      '这个开头五要诀都落地：谁在哪里、有什么压力、为什么要选择、要做什么都简单清楚；剧情不偏主线，切入快，第一个小剧情有认亲爽点和倒计时冲突，绝不平淡。',
    ].join('\n')
    const slowText = [
      '清晨的阳光落在城市边缘，风吹过老小区的梧桐树。',
      '这座城市有很多年的历史，李岚所在的街区也经历过复杂变迁。',
      '过了很久，李岚才慢慢想起自己昨天失业了。',
      '门外似乎有人，但故事暂时还没有进入正题。',
    ].join('\n')

    const okReport = buildOpeningSyncReport(project, chapter, contextPackage, openingText)
    const warnReport = buildOpeningSyncReport(project, chapter, contextPackage, slowText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('开篇设计 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['主角登场', '爽点/期待点', '三大基点', '目标与卖点', '开头五要诀', '信息释放']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('开篇缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['主角登场', '爽点/期待点', '三大基点', '开头五要诀', '开篇禁忌']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('five_essentials_rules')
    expect(warnReport.next_actions.join('；')).toContain('前300字')
    expect(warnReport.next_actions.join('；')).toContain('简单/不偏/快/爽/不平')
  })

  test('opening sync carries planned core conflict alignment into forbidden checks', () => {
    const project = { title: '试炼资格' }
    const chapter = { id: 16, chapter_no: 16, title: '资格作废' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        conflict: '执事设局阻拦李玄参加试炼。',
      },
    }
    const chapterText = [
      '李玄刚踏进演武场，玉牌突然炸出倒计时：十息内交出袖中账册，否则资格作废。',
      '执法弟子伸手来抢，他按住账册后退一步，问是谁改了规矩。',
      '看台下的人群被红光逼得散开，他抓住玉牌，决定先保住账册再查倒计时来源。',
    ].join('\n')

    const report = buildOpeningSyncReport(project, chapter, contextPackage, chapterText)
    const forbiddenCheck = report.missed.find((item: any) => item.key === 'opening_forbidden')

    expect(forbiddenCheck).toBeTruthy()
    expect(forbiddenCheck.missed_items).toContain('开篇核心冲突扫描')
    expect(forbiddenCheck.evidence.join('；')).toContain('执事设局阻拦李玄参加试炼')
  })

  test('story state sync persists an opening_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'opening_sync', payloadKey: 'opening_sync'")
    expect(source).toContain('buildOpeningSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.opening_sync = openingSync')
  })

  test('checks prose craft contract delivery after chapter text is written', () => {
    const project = { title: '旧城账册' }
    const chapter = { id: 16, chapter_no: 16, title: '一块钱转账单' }
    const contextPackage = {
      chapter_target: {
        prose_craft_contract: {
          version: 'oh_story_prose_craft_v1',
          source: 'manual',
          pov_rules: ['深度限知：只写沈砚当下能看见、听见、触到和推断出的内容。'],
          expression_rules: ['身体细节替代情绪词：愤怒、委屈、悲伤必须落到手、呼吸、肩背或具体动作。'],
          scene_weaving_rules: ['三维度揉进：事件推进、感官/物件、身体反应必须同场出现。'],
          rhythm_rules: ['一动一静：动作推进和静态观察交替，不能连续空想。'],
          object_number_rules: ['具体数字和道具必须承担剧情功能：八万块、一块钱、账本、旧疤。'],
          section_structure_rules: [
            '小节内部结构：一个主事件 + 3-5 个子事件，一个情绪变化，一条读者新获知的信息，必要时 3-5 轮对话交锋。',
            '小节之间衔接：小节结尾留钩子，下一节开头快速接续，不重新铺垫，情绪跨节递进。',
          ],
          section_density_rules: ['小节密度诊断：每个小节至少有目标、阻碍、信息增量或情绪变化。'],
          anti_padding_rules: ['不得为凑字数加环境描写、重复情绪、内心独白总结或无意义动作。'],
          concept_anchor_rules: ['新名词/新设定首次出现时，必须靠动作反应、对话半句或物理后果给读者一个当下作用锚点。'],
          scene_anchors: ['沈砚手腕旧疤被桌沿压住', '对手把账本推过来', '八万块欠款和一块钱转账单'],
          forbidden_patterns: ['他不知道的是', '如果她知道真相', '所有人都没有发现'],
          quality_checks: ['每个详写子事件必须让动作、身体细节和数字承担剧情功能。'],
        },
      },
      setting_context: {
        chapter_usage: [
          { name: '蓝晶', usage_type: 'new_concept', summary: '首次出现的记忆载体。' },
        ],
      },
    }
    const craftedText = [
      '沈砚看见对手把账本推到灯下，封皮边缘压住那张一块钱的转账单。',
      '他没有抬头，手腕旧疤被桌沿硌住，指尖先停了一下，再把八万块欠款那一页翻出来。',
      '“签。”执事把笔往前一推。',
      '“这页不对。”沈砚把账本压回灯下。',
      '“哪里不对？”',
      '“尾号少了一笔。”',
      '这一节的主事件从签认罪书变成核对尾号：账本暴露信息，八万块抬高代价，一块钱转账单改变现场风向，执事的笑意第一次停住。',
      '林青禾立刻接住尾号线索，把蓝晶按上太阳穴，陌生人的记忆碎片在她眼前炸开，旧账本缺页的位置随之浮出来。',
      '执事问他还要拖多久，沈砚听见纸页摩擦声，肩背绷紧，却只把账本往前推了半寸。',
      '这一动之后，屋里静下来。他盯着转账单的尾号，确认对方昨夜只付了一块钱。',
      '“你现在还要我签吗？”',
      '执事没有答，门外却有人敲了三下，下一节必须接这张转账单背后的签收印章。',
    ].join('\n')
    const paddedText = [
      '他不知道的是，所有人都已经看穿了一切。',
      '如果她知道真相，她一定会很悲伤，他也很愤怒、很委屈、很难过。',
      '蓝晶是旧王朝留下来的记忆器，源于三百年前的祭司制度，分为七阶九品，后续再解释具体用法。',
      '大厅很宽，墙壁很旧，风从窗外吹进来，空气显得十分压抑。',
      '他想了很多很多，觉得命运就是这样，大家都在等待事情结束。',
    ].join('\n')

    const okReport = buildProseCraftSyncReport(project, chapter, contextPackage, craftedText)
    const warnReport = buildProseCraftSyncReport(project, chapter, contextPackage, paddedText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('正文工艺 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['深度限知', '身体细节', '三维度揉进', '道具/数字功能', '小节结构', '小节密度', '新概念锚点']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('正文工艺缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['深度限知', '身体细节', '小节结构', '新概念锚点', '正文工艺毒点']))
    expect(warnReport.missed.find((item: any) => item.key === 'section_structure_rules')?.repair_instruction).toContain('主事件')
    expect(warnReport.missed.find((item: any) => item.key === 'section_structure_rules')?.repair_instruction).toContain('下一节开头快速接续')
    expect(warnReport.missed.find((item: any) => item.key === 'concept_anchor_rules')?.repair_instruction).toContain('动作反应')
    expect(warnReport.next_actions.join('；')).toContain('身体细节')
    expect(warnReport.next_actions.join('；')).toContain('小节结构')
    expect(warnReport.next_actions.join('；')).toContain('新概念')
  })

  test('story state sync persists a prose_craft_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'prose_craft_sync', payloadKey: 'prose_craft_sync'")
    expect(source).toContain('buildProseCraftSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.prose_craft_sync = proseCraftSync')
  })

  test('checks punctuation tone contract delivery after chapter text is written', () => {
    const project = { title: '旧城账册' }
    const chapter = { id: 17, chapter_no: 17, title: '签收印' }
    const contextPackage = {
      chapter_target: {
        punctuation_tone_contract: {
          version: 'oh_story_punctuation_tone_v1',
          source: 'manual',
          tone_punctuation_map: [
            '质问 / 试探 / 反问：关键问题用问号和短促追问片段，配合动作停顿。',
            '惊讶 / 爆发 / 打脸：真正爆点只保留少量感叹号，爆点前后用短句承接。',
            '压迫 / 冷静 / 克制：用短句、逗号、句号或冒号压出判断落点。',
          ],
          forbidden_marks: ['不得使用 ……、...、——、—、-- 硬造停顿。'],
          scene_tone_plan: [
            '场景1：质问 / 试探 / 反问；签收印真假用短促追问推进。',
            '场景2：惊讶 / 爆发 / 打脸；爆点只保留一次功能性感叹。',
          ],
          quality_checks: ['标点必须服务语气、人物声线和情绪节奏，不能通篇句号化。'],
        },
      },
    }
    const tunedText = [
      '执事按住签收印：“你凭什么说它是真的？”',
      '沈砚把账本翻到尾页，停了一拍：“印泥缺口在这里。昨夜谁碰过柜门？”',
      '对方脸色一沉。',
      '第二份名单摊开时，长老席有人站了起来：“这枚印，是真的！”',
      '沈砚没有追喊。他只把一块钱转账单压在印章旁边：欠款、签收、尾号，全对上了。',
      '屋里静了三息。',
    ].join('\n')
    const noisyText = [
      '执事按住签收印……你凭什么说它是真的——',
      '沈砚想解释很多很多。',
      '众人震惊！！！？？',
      '他很冷静。',
      '他看着账本。',
      '他继续等待。',
      '他觉得事情会结束。',
      '他最后点了点头。',
      '大家都没有再说话。',
      '夜色很深。',
    ].join('\n')

    const okReport = buildPunctuationToneSyncReport(project, chapter, contextPackage, tunedText)
    const warnReport = buildPunctuationToneSyncReport(project, chapter, contextPackage, noisyText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('语气标点 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['语气谱系', '禁用标点', '功能性问号', '爆点标点']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('语气标点缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['禁用标点', '语气标点硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('动作停顿')
  })

  test('story state sync persists a punctuation_tone_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'punctuation_tone_sync', payloadKey: 'punctuation_tone_sync'")
    expect(source).toContain('buildPunctuationToneSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.punctuation_tone_sync = punctuationToneSync')
  })

  test('checks quality audit contract delivery after chapter text is written', () => {
    const project = { title: '长夜账本' }
    const chapter = { id: 18, chapter_no: 18, title: '第二份证据' }
    const okContextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '第二份证据',
        summary: '主角放出第二份证据，让反派第一次失去主动。',
        conflict: '反派试图用新设定解释旧账本，主角必须证明这不是水剧情而是局势变化。',
        ending_hook: '最后一页账本指向第三个证人。',
        quality_audit_contract: {
          version: 'oh_story_quality_audit_v1',
          source: 'manual',
          structure_checks: ['章节结构：开头有钩子，中段有推进，局势有变化，结尾落在变化上而不是总结。'],
          chapter_purpose_rules: ['每章一句话概括内容，并标注目的词：铺垫/高潮/爽点/打脸/人物塑造/设定。'],
          progression_checks: ['水文检测：删掉这章会影响理解吗？不会就是水了。'],
          information_checks: ['信息必须跟着冲突走，一章不超 3 个新概念。'],
          event_content_rules: ['事件驱动：正文章节必须由事件组成，事件内容比重不能小于一半；事件是价值改变的契机；设定尽量通过事件演绎，而非旁白强塞。'],
          longform_checks: ['最近 5 章是否有明确进展，爽点间隔是否过长。'],
          five_dimension_rubric: ['五维评分必须都达到 78：核心一致度、表层重写度、格式一致度、可读性、逻辑连贯。'],
          selling_point_expression_rules: ['卖点表达：发现比告知爽十倍；用剧情、对话、反应隐性展示；按开头暗示 -> 中间深化 -> 高潮爆发递进。'],
          chapter_focus: ['本章核心事件：第二份证据改变局势', '章尾必须落在第三个证人翻页钩子'],
          revision_strategies: ['rewrite', 'compress', 'de_ai', 'polish'],
          quality_checks: ['必须确认本章不可删除，且最低分维度有精修策略。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '证据开场',
            purpose: '开头有钩子并推进核心事件。',
            conflict: '反派抢先宣布账本无效。',
            reader_payoff: '第二份证据改变局势。',
          },
        ],
      },
      setting_context: {
        chapter_usage: [
          { name: '血契账本', usage_type: 'introduce', summary: '本章唯一新增概念。' },
        ],
      },
    }
    const warnContextPackage = {
      ...okContextPackage,
      setting_context: {
        chapter_usage: [
          { name: '镜州旧印', usage_type: 'introduce' },
          { name: '血契账本', usage_type: 'new_concept' },
          { name: '盐商暗码', status: '首次引入' },
          { name: '夜巡司令牌', is_new: true },
        ],
      },
    }
    const auditedText = [
      '账本第二页翻开时，沈砚先把第一份证据压在灯下：反派昨夜说过的尾号，和新账页完全对不上。',
      '反派抢先宣布账本无效，沈砚没有解释设定，只让账房当场核对血契账本的红印。',
      '开头只暗示血契账本和尾号对不上，中段借账房的迟疑和反派的追问深化卖点，高潮时旁观者看见红印变黑才同时倒吸一口气。',
      '本章一句话目的：第二份证据把审判从旧账争辩推到第三证人线索；目的词是打脸和爽点，证据核对详写，铺垫只保留少量功能信息。',
      '旁观者开始倒向主角，局势变化很清楚：反派从主动指控变成必须解释旧账本来源。',
      '本章事件含量超过一半：翻账、逼问、核对、改口、撕页五个事件连续改变现场价值，设定都通过证据核对和旁观反应演绎出来。',
      '这章删掉会影响理解，因为第二份证据让主线从真假账本推进到第三个证人的身份。',
      '章尾落在具体翻页钩子上：最后一页账本指向第三个证人，证人名字正好被撕掉一半。',
      '五维自检：核心一致度、表层重写度、格式一致度、可读性、逻辑连贯都超过78；最低分用 polish 修句间衔接。',
    ].join('\n')
    const wateryText = [
      '清晨的阳光落在长街上，风吹过屋檐，空气显得十分安静。',
      '这座城有很多年的历史，镜州旧印、血契账本、盐商暗码、夜巡司令牌都有复杂来历。',
      '本章核心卖点很爽，读者会很喜欢这个设定，这是本章爽点。',
      '关于这些设定，前文已经说过很多，本章只是再次回顾它们的意义和背景。',
      '大家坐着等了很久，反派没有失去主动，主角也没有拿出新证据。',
      '事情暂时没有变化。',
    ].join('\n')

    const okReport = buildQualityAuditSyncReport(project, chapter, okContextPackage, auditedText)
    const warnReport = buildQualityAuditSyncReport(project, chapter, warnContextPackage, wateryText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('质量诊断 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章节结构', '章纲目的词', '章节推进', '信息负载', '事件含量', '五维底线', '卖点表达']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('质量诊断缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章节结构', '章纲目的词', '章节推进', '事件含量', '卖点表达', '质量诊断硬伤']))
    expect(warnReport.missed.find((item: any) => item.key === 'event_content_rules')?.repair_instruction).toContain('事件内容比重')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('selling_point_expression_rules')
    expect(warnReport.next_actions.join('；')).toContain('水文')
    expect(warnReport.next_actions.join('；')).toContain('事件')
    expect(warnReport.next_actions.join('；')).toContain('目的词')
    expect(warnReport.next_actions.join('；')).toContain('卖点')
  })

  test('story state sync persists a quality_audit_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'quality_audit_sync', payloadKey: 'quality_audit_sync'")
    expect(source).toContain('buildQualityAuditSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.quality_audit_sync = qualityAuditSync')
  })

  test('checks dialogue contract delivery after chapter text is written', () => {
    const project = { title: '反证长篇' }
    const chapter = { id: 19, chapter_no: 19, title: '当众试探' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          source: 'manual',
          scene_modes: ['反转模式', '压制模式'],
          voice_anchors: ['李玄短句反问；周薄森长篇压迫；林青禾克制给事实。'],
          dialogue_goals: ['让周薄森说漏证据来源。'],
          key_lines: ['“你怎么知道账本在我手里？”'],
          relationship_moves: ['旁观者从中立转为愿意作证。'],
          mode_playbooks: ['反转模式：对方嚣张 2-3 行 -> 主角亮出 1 行事实 -> 对方沉默。'],
          power_length_rules: ['掌控者/主角亮底牌时对白 ≤ 10 字', '被压制方对白 ≥ 20 字'],
          subtext_agenda_rules: ['真实动机绝对不能浅显地写在台词里，台词只露出借口、试探或防御。'],
          dialogue_drive_rules: ['对话本身带来/强化期待、爽感或悬念。'],
          information_embed_rules: ['用角色的语气和立场包裹信息，避免说明书式对话。'],
          voice_differentiation_rules: ['口癖、节奏、信息偏好和身份措辞必须不同。'],
          dialogue_rhythm_rules: ['连续多轮对话后需要换气，穿插动作描写。'],
          dialogue_audit_rules: ['遮住角色名后能否区分是谁在说话。'],
          quality_checks: ['每句对白至少承担推进剧情、增加期待感或展示人设之一。'],
        },
      },
    }
    const dialogueText = [
      '周薄森把袖口往案上一压。',
      '“李玄，你若真要当众翻旧账，就先说清楚昨夜谁把账本送进祠堂。别拿一句怀疑糊弄长老席，周家不是任你泼脏水的地方。”',
      '李玄看着他袖口的墨点。',
      '“你怎么知道账本在我手里？”',
      '周薄森顿住。',
      '林青禾把封条递给长老。',
      '“封口是今晨开的。”',
      '旁观者的低声议论停了，原本站在周薄森身后的人退开半步。',
      '李玄只补了一句。',
      '“说漏了。”',
    ].join('\n')
    const badText = [
      '“你知道吗，血契账本是一种非常复杂的设定，它的来源、规则、使用方法和历史背景都很长，所以我现在要完整解释给你听。”',
      '“好的，那么请你告诉我血契账本是什么？”',
      '“血契账本就是用血验证身份的账本，这意味着它可以证明谁拿过账本。”',
      '“原来如此，那么你为什么要这样做？”',
      '“因为我的真实目的就是进门拿账本，我没有别的借口。”',
      '“你说得太好了，你真厉害。”',
    ].join('\n')

    const okReport = buildDialogueSyncReport(project, chapter, contextPackage, dialogueText)
    const warnReport = buildDialogueSyncReport(project, chapter, contextPackage, badText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('对白质量 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['对白目标', '权力博弈', '潜台词与议程', '对白驱动力', '信息嵌入', '对话审计', '声线差异']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('对白缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['潜台词与议程', '对白驱动力', '信息嵌入', '对话审计', '对白硬伤']))
    expect(warnReport.missed.find((item: any) => item.key === 'dialogue_drive_rules')?.repair_instruction).toContain('推进剧情、增加期待感或展示人设')
    expect(warnReport.missed.find((item: any) => item.key === 'information_embed_rules')?.repair_instruction).toContain('科普嘴')
    expect(warnReport.missed.find((item: any) => item.key === 'dialogue_audit_rules')?.repair_instruction).toContain('对话结尾')
    expect(warnReport.next_actions.join('；')).toContain('说明书式对白')
  })

  test('flags dialogue blocks that can be deleted without losing plot expectation or characterization', () => {
    const project = { title: '反证长篇' }
    const chapter = { id: 1901, chapter_no: 19, title: '空转寒暄' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_drive_rules: ['每句对白至少承担推进剧情、增加期待感或展示人设之一，否则删除。'],
          dialogue_audit_rules: ['删掉这段对话后，情节、期待和情绪都不受影响，则判定为水字数。'],
        },
      },
    }
    const fillerText = [
      '“你来了。”',
      '“嗯，我来了。”',
      '“今天辛苦了。”',
      '“还好，不算辛苦。”',
      '“那我们继续吧。”',
      '“好，继续。”',
      '“你真的很厉害。”',
      '“哪里哪里。”',
      '两人说完，事情没有新变化，也没有任何线索、行动、悬念或关系变化。',
    ].join('\n')
    const functionalText = [
      '周薄森把空白封条拍到桌上。',
      '“昨夜送账本的人，左袖有墨。”',
      '李玄没有接话，只把第二份账册翻到缺页。',
      '“你怎么知道是左袖？”',
      '周薄森的手指僵住。',
      '林青禾退到长老身侧。',
      '“我作证，他刚才说漏了。”',
      '原本站在周薄森身后的人退开半步。',
    ].join('\n')

    const fillerReport = buildDialogueSyncReport(project, chapter, contextPackage, fillerText)
    const functionalReport = buildDialogueSyncReport(project, chapter, contextPackage, functionalText)

    expect(fillerReport.status).toBe('warn')
    expect(fillerReport.missed.map((item: any) => item.label)).toContain('可删除对白')
    expect(fillerReport.missed.find((item: any) => item.key === 'dialogue_functional_filler')?.repair_instruction).toContain('删掉这段对话')
    expect(fillerReport.priority_repair).toBe('优先删可删除对白')
    expect(functionalReport.missed.map((item: any) => item.label)).not.toContain('可删除对白')
  })

  test('flags meme jokes that break high pressure dialogue beats', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 1902, chapter_no: 19, title: '血封条' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_meme_rules: ['高压/生死/悲痛/严肃 beat 里，搞笑担当与轻快配角的玩笑、口头梗、插科打诨一律收敛。'],
          quality_checks: ['这句玩笑放进当前基调会不会让读者出戏？会就删/改。'],
        },
      },
    }
    const badText = [
      '血从封条下渗出来，周薄森的护卫倒在门槛边，呼吸只剩半截。',
      '“笑死，这也太会整活了吧，咱们今天算不算大型翻车现场？”',
      '李玄按住伤口，脸色沉下去。',
    ].join('\n')
    const restrainedText = [
      '血从封条下渗出来，周薄森的护卫倒在门槛边，呼吸只剩半截。',
      '“别说话。”',
      '李玄按住伤口，声音压得很低。',
      '“先封门。”',
    ].join('\n')

    const badReport = buildDialogueSyncReport(project, chapter, contextPackage, badText)
    const okReport = buildDialogueSyncReport(project, chapter, contextPackage, restrainedText)
    const forbidden = badReport.missed.find((item: any) => item.key === 'dialogue_forbidden')

    expect(forbidden?.missed_items || []).toContain('高压玩梗扫描')
    expect(forbidden?.repair_instruction).toContain('梗只在安全或喘息 beat 放')
    expect(okReport.missed.find((item: any) => item.key === 'dialogue_forbidden')?.missed_items || []).not.toContain('高压玩梗扫描')
  })

  test('flags joke delivery that is detached from character desire relationship or consequence', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 1903, chapter_no: 19, title: '账本笑点' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_meme_rules: ['幽默来自角色的欲望/偏见/固执/误判，不是脱离剧情的段子。'],
          quality_checks: ['包袱改变地位、暴露关系、制造未来代价。'],
        },
      },
    }
    const badText = [
      '李玄和林青禾正准备查账。',
      '“我给你讲个和剧情无关的段子，保证大家都笑死，哈哈。”',
      '他说完以后，账本、关系和下一步行动都没有任何变化。',
    ].join('\n')
    const functionalText = [
      '李玄想装作没看见账本缺页，手却先把封条压歪了。',
      '林青禾看着他的手。',
      '“你这叫冷静？账本都被你按出指纹了。”',
      '旁边的执事憋住笑，随即意识到封条被碰过，立刻改口愿意作证。',
      '李玄欠了林青禾一个人情，下一场审问必须先替她挡住会长。',
    ].join('\n')

    const badReport = buildDialogueSyncReport(project, chapter, contextPackage, badText)
    const okReport = buildDialogueSyncReport(project, chapter, contextPackage, functionalText)
    const forbidden = badReport.missed.find((item: any) => item.key === 'dialogue_forbidden')

    expect(forbidden?.missed_items || []).toContain('脱剧情段子扫描')
    expect(forbidden?.repair_instruction).toContain('幽默来自角色欲望、偏见、固执或误判')
    expect(okReport.missed.find((item: any) => item.key === 'dialogue_forbidden')?.missed_items || []).not.toContain('脱剧情段子扫描')
  })

  test('flags humor callbacks that repeat without escalating embarrassment publicity or consequence', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 1904, chapter_no: 19, title: '回调封条' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_meme_rules: ['回调必须升级：更尴尬、更公开、更严重。'],
          quality_checks: ['同一个梗回调时，必须带来更强的处境、关系或代价。'],
        },
      },
    }
    const flatText = [
      '上一场林青禾说李玄按歪封条很好笑。',
      '这一场她又把同一个梗重复了一遍，说法和上次一样，没有更尴尬、没有更公开，也没有更严重的后果。',
      '众人听完只是笑了一下，账本审问继续原样推进。',
    ].join('\n')
    const upgradedText = [
      '上一场林青禾说李玄按歪封条很好笑。',
      '这一场她没再重复笑话，只把封条举给满堂长老看。',
      '“这回不是按歪，是按出了会长的指纹。”',
      '笑声停住，周薄森当众失去解释权，李玄也因此欠下林青禾一次公开作证的人情。',
    ].join('\n')

    const flatReport = buildDialogueSyncReport(project, chapter, contextPackage, flatText)
    const upgradedReport = buildDialogueSyncReport(project, chapter, contextPackage, upgradedText)
    const forbidden = flatReport.missed.find((item: any) => item.key === 'dialogue_forbidden')

    expect(forbidden?.missed_items || []).toContain('回调未升级扫描')
    expect(forbidden?.repair_instruction).toContain('回调必须升级')
    expect(upgradedReport.missed.find((item: any) => item.key === 'dialogue_forbidden')?.missed_items || []).not.toContain('回调未升级扫描')
  })

  test('flags humor payoffs that land without aftermath reaction or consequence', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 1905, chapter_no: 19, title: '空包袱' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_meme_rules: ['铺垫要短，回报要清晰，余波比包袱本身更重要。'],
          quality_checks: ['包袱改变地位、暴露关系、制造未来代价。'],
        },
      },
    }
    const hollowText = [
      '李玄想装得很稳，袖口却把封条蹭歪。',
      '林青禾看了一眼。',
      '“你这不叫冷静，这叫翻车现场。”',
      '众人只是笑了一下，审问继续原样推进，没有关系变化，也没有后续代价。',
    ].join('\n')
    const aftermathText = [
      '李玄想装得很稳，袖口却把封条蹭歪。',
      '林青禾看了一眼。',
      '“你这不叫冷静，这叫翻车现场。”',
      '笑声刚起就停住，执事发现封条上的指纹，当场改口作证。',
      '李玄欠下林青禾一个公开人情，下一场审问必须替她挡住会长。',
    ].join('\n')

    const hollowReport = buildDialogueSyncReport(project, chapter, contextPackage, hollowText)
    const aftermathReport = buildDialogueSyncReport(project, chapter, contextPackage, aftermathText)
    const forbidden = hollowReport.missed.find((item: any) => item.key === 'dialogue_forbidden')

    expect(forbidden?.missed_items || []).toContain('包袱无余波扫描')
    expect(forbidden?.repair_instruction).toContain('余波比包袱本身更重要')
    expect(aftermathReport.missed.find((item: any) => item.key === 'dialogue_forbidden')?.missed_items || []).not.toContain('包袱无余波扫描')
  })

  test('warns when one scene gives dialogue to more than three supporting characters', () => {
    const project = { title: '反证长篇' }
    const chapter = { id: 191, chapter_no: 19, title: '当众试探' }
    const contextPackage = {
      chapter_target: {
        protagonist_name: '李玄',
        scene_cards: [
          {
            scene_no: 1,
            title: '公开试探',
            characters_present: ['李玄', '周薄森', '林青禾', '钱越', '赵执事', '宋管事'],
          },
        ],
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          source: 'manual',
          supporting_speaker_limit_rules: [
            '同一场景配角不超过 3 个有台词；没有功能的角色不要出场。',
          ],
          quality_checks: ['检查配角台词人数，避免多人同场抢主线。'],
        },
      },
    }
    const okText = [
      '李玄：“够了。”',
      '周薄森：“李玄，你若真要当众翻旧账，就先说清楚昨夜谁把账本送进祠堂。”',
      '林青禾：“封口是今晨开的。”',
      '钱越：“我只看见一盏灯。”',
      '李玄：“说漏了。”',
    ].join('\n')
    const crowdedText = [
      '李玄：“够了。”',
      '周薄森：“李玄，你若真要当众翻旧账，就先说清楚昨夜谁把账本送进祠堂。”',
      '林青禾：“封口是今晨开的。”',
      '钱越：“我只看见一盏灯。”',
      '赵执事：“我能证明他进过后院。”',
      '宋管事：“我也听见了更夫报时。”',
      '李玄：“说漏了。”',
    ].join('\n')

    const okReport = buildDialogueSyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildDialogueSyncReport(project, chapter, contextPackage, crowdedText)

    expect(okReport.delivered.map((item: any) => item.key)).toContain('supporting_speaker_limit_rules')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('配角台词人数')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('supporting_speaker_limit_rules')
    expect(warnReport.priority_repair).toContain('配角台词人数')
    expect(warnReport.next_actions.join('；')).toContain('同一场景最多保留 3 个配角发言')
  })

  test('story state sync persists a dialogue_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'dialogue_sync', payloadKey: 'dialogue_sync'")
    expect(source).toContain('buildDialogueSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.dialogue_sync = dialogueSync')
  })

  test('checks character behavior contract delivery after chapter text is written', () => {
    const project = { title: '反证长篇' }
    const chapter = { id: 20, chapter_no: 20, title: '当堂反问' }
    const contextPackage = {
      chapter_target: {
        character_behavior_contract: {
          version: 'oh_story_character_behavior_v1',
          source: 'manual',
          motivation_chain: [
            '起因：周薄森抢先把伪账本压到长老席上。',
            '意图：李玄必须保住证据来源并逼周薄森说漏。',
            '约束：李玄不能直接暴露林青禾的证人身份。',
            '风险：若反问失败，旁观者会重新倒向周薄森。',
          ],
          motivation_specificity_rules: [
            '起因必须具体，不写“被欺负”这种模糊说法；动机必须是情感层面的，不写“要成为最强”这种空话。',
          ],
          layered_tags: [
            '身份标签：被逐出宗祠的账房学徒。',
            '表现标签：克制、短句、先看证据再说话。',
            '内核标签：对证据归属寸步不让。',
          ],
          behavior_rules: ['展示优于告知：态度、弱点和成长必须通过行动/对话/反应体现。'],
          protagonist_composure_rules: [
            '升级线与主角反应线分开管理：升级提升的是实力，不自动改变主角从容反应。',
            '面对低级挑衅时，主角应表现为不被牵着走；高实力/高阅历角色用轻描淡写、短句或行动压制回应。',
          ],
          strong_association_rules: [
            '人设关联分层：每个重要角色至少 3 个强关联设定。',
            '强关联必须直接影响剧情走向、核心梗、装逼爽点或人物碰撞。',
            '弱关联如外貌、爱好、身高体重只能做记忆点，不能喧宾夺主。',
          ],
          memory_anchors: ['李玄习惯先按住旧夹克袖口，再用短句反问。'],
          supporting_role_functions: ['林青禾：只给事实证据，不替主角解释。'],
          role_card_requirements: [
            '主角卡必须包含角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作。',
          ],
          supporting_role_exit_rules: [
            '配角卡必须包含角色功能、与主角关系、核心特质、标志性特征、退场方式；同一场景配角不超过 3 个有台词。',
          ],
          behavior_repeat_rules: [
            '人物行为重复点：抓住读者喜欢的人物行为特质，并在不同场景重复。',
          ],
          character_driven_event_rules: [
            '人推事件优先：情节从人物性格、动机和选择自然推出；卡文时从人物动机找方向，不要硬编剧情。',
          ],
          protagonist_red_line_rules: [
            '主角红线：不能写圣母型主角、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃。',
          ],
          identity_goldfinger_alignment_rules: [
            '主角人设必须与全书气质相符：社会身份、身世、金手指、性格高度统一。',
          ],
          antagonist_logic: ['周薄森为了保住账本来源，必须先用身份压人再转移证据焦点。'],
          antagonist_weight_rules: [
            '反派建立四要素：实力展示、动机可信、真实威胁、终极意图时机缺一不可。',
            '反派的智商/实力决定主角的含金量；反派弱，主角赢没意义。',
            '中等反派及以上必须至少赢主角一次，或在本章造成真实威胁。',
            '反派真实目的不要开场说尽，终极意图留到关键反转点。',
            '反派是主角的镜子，长处要照出主角弱点。',
          ],
          antagonist_self_story_rules: [
            '反派也有梦想：在反派眼中他是自己故事的主人公。',
            '反派要有自己的目标、旧痛和避免的痛苦，不能只是纯工具人。',
            '反派的优势本身也是致命缺陷，遭遇逆境时会强化缺陷。',
            '大弧 Boss 要有让读者恨不起来的侧面，并和主角形成理念冲突。',
          ],
          antagonist_tier_exit_rules: [
            '按反派层级表设计，篇幅与层级匹配。',
            '小反派 1-5 章，只承担单个小弧线障碍，1-2 个鲜明特征，退场要被打败或揭穿、干脆利落。',
            '中等反派 10-30 章，是一卷主要对手，必须有动机、手段、至少赢主角一次，退场要被主角正面击败并有爽感。',
            '大弧 Boss 代表阶段核心矛盾，要有完整人弧、理念冲突、绝境对决、让人恨不起来的侧面和有仪式感的终战落幕。',
            '最终 Boss 是全书核心矛盾具象化，必须从第一章伏笔，代表主题反面，实力碾压且有信念。',
          ],
          quality_checks: ['角色行为必须由动机链驱动。'],
        },
      },
    }
    const behaviorText = [
      '周薄森抢先把伪账本压到长老席上，李玄先按住旧夹克袖口，没有立刻看林青禾。',
      '他想保住证据来源，也要逼周薄森说漏账本来路；可他不能直接暴露林青禾的证人身份。',
      '李玄只抬眼问了一句：“你怎么知道账本在我手里？”',
      '旁观者原本要倒向周薄森，听见这句短问后停住。',
      '反派学徒低声骂他废物，李玄没有被这句低级挑衅牵着走，只轻描淡写地把封条推到灯下：“看字。”',
      '这次旧印升级只提升他的验印能力，没有改变他的从容反应；他的压制来自短句和动作，而不是暴怒反击。',
      '林青禾没有替他解释，只把今晨开的封条放到案边。',
      '林青禾的配角功能是事实证人，与李玄是互相保密的同盟；她的核心特质是谨慎，标志性特征是只递证据不解释，退场方式已规划为封条作证完成后主动退到旁听席。',
      '周薄森为了保住账本来源，先用长老席身份压人，又急着转移证据焦点，反倒露出昨夜进祠堂的破绽。',
      '周薄森先亮出长老席背书和账房封锁令，展示实力和手段；他想保住账本来源，这个动机从他的视角说得通。',
      '他没有立刻说出终极意图，只用资格封锁和证据反咬压住李玄一次，让李玄短暂失去主动。',
      '周薄森擅长借规则压人，正好照出李玄面对权威时习惯退让的弱点。',
      '周薄森不是只想害李玄；在他眼中，自己才是守住宗祠账权的主人公。',
      '他当年被旧账牵连失去师门，所以宁可用规则压人，也要避免再次被证据拖下水；这种守规则的长处正是他的致命缺陷。',
      '他还有给病重幼妹保住药账的侧面，让人恨不起来一点；但他相信秩序必须压过个人证词，和李玄的证据公道形成理念冲突。',
      '李玄不是因为被欺负才反问；具体起因是母亲旧铺的账权在众目睽睽下被伪账本夺走，他要保住母亲留下的证据和林青禾的安全。',
      '这个动机是羞辱、亲情和亏欠压出来的情感驱动，不是“要成为最强”这种空话；他后续从隐忍到公开反问，也有封条递上案边作为铺垫。',
      '李玄的人设强关联有三条：第一是账房审证能力，能直接拆伪账本；第二是母亲旧铺的人脉，能调动林青禾作证；第三是旧夹克里的录音证据，能制造当堂反转和装逼爽点。',
      '这些强关联都影响剧情走向和人物碰撞，不只是身高、外貌、爱吃甜糕这种弱关联爱好。',
      '李玄的角色定位是落魄账房证人，身份标签是被逐出宗祠的账房学徒；外貌特征是瘦高、旧夹克、左手有疤，核心目标是夺回母亲旧铺，核心动机是守住亲情和尊严，致命弱点是面对权威先藏招，口头禅和标志动作是按住旧夹克袖口后短句反问。',
      '他每到关键选择都会先按住旧夹克袖口，这个行为重复点在开场藏证据、中段推封条、章尾反问前重复出现。',
      '这场不是外部事件硬砸他，而是李玄保住母亲旧铺和林青禾安全的动机，把当堂反问自然推出来；情节坚持人推事件，不靠作者硬编剧情。',
      '他没有触碰主角红线：不圣母、不无脑战斗机器、不内核邪恶、不因蠢犯错、不自暴自弃。',
      '他的显性身份是落魄账房学徒，隐性身世连到母亲旧铺账权，显性金手指是验印能力，隐性金手指是克制短句，社会身份、身世、金手指、性格高度统一。',
      '这场戏按反派层级表定位为中等反派阶段：周薄森是一卷主要对手，靠账房资源和长老席权谋连续施压。',
      '他已经短暂赢主角一次，后续退场规划是被李玄用证据链正面击败，揭穿账权骗局并给读者爽感。',
    ].join('\n')
    const badText = [
      '李玄忽然性格大变，什么也没想就冲上去大喊。',
      '他刚刚升级成功，被反派学徒骂了一句废物，立刻气得要死，面红耳赤地暴怒反击，被这个低级挑衅牵着走。',
      '他的起因就是被欺负，动机就是要成为最强，后面又毫无铺垫地变成只想回家。',
      '他的人设很复杂，也很聪明，大家都知道他不会犯错。',
      '他只有身高、外貌、爱吃甜糕和喜欢黑衣这些弱关联爱好，没有任何能影响剧情走向的强关联。',
      '林青禾只在旁边说：“你太厉害了。”',
      '周薄森明明可以销毁账本，却站在原地嘲讽，主动把秘密告诉所有人。',
      '反派很弱，只是纯粹的坏，赢了也没意义。',
      '他开场就把真实目的主动说完，然后降智送赢。',
      '周薄森只是纯工具人，只负责阻碍主角，没有原因，也没有自己的目标。',
      '他是脸谱化疯子怪物，只是纯粹的坏。',
      '反派层级和篇幅不匹配，小反派拖成三十章，大弧 Boss 像路人一样随便退场。',
      '最终 Boss 没有第一章伏笔，也没有信念，只是突然冒出来的怪物。',
      '配角退场方式没有规划，写着写着忘了，五个配角一直发言。',
      '他没有行为重复点，口头禅和标志动作写着写着忘了。',
      '剧情需要一个外部事件突然砸来，和他的动机无关；作者硬编剧情让事情自己解决。',
      '他是圣母型主角，明知道对方会害人仍因蠢犯错原谅反派，后来又自暴自弃。',
      '他开场职业是账房，突然靠毫无铺垫的战神系统横扫所有人，社会身份、身世、金手指、性格完全不统一。',
      '事情很快解决，旁观者都觉得主角做得对。',
    ].join('\n')

    const okReport = buildCharacterBehaviorSyncReport(project, chapter, contextPackage, behaviorText)
    const warnReport = buildCharacterBehaviorSyncReport(project, chapter, contextPackage, badText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('角色行为 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['动机链', '动机具体性', '行为规则', '主角逼格反应', '人设强关联', '记忆锚点', '配角功能', '角色卡必备项', '配角退场规划', '行为重复点', '人推事件', '主角红线', '身份/金手指对齐', '反派逻辑', '反派分量', '反派自我叙事', '反派层级退场']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('角色行为缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['动机链', '动机具体性', '主角逼格反应', '人设强关联', '配角退场规划', '行为重复点', '人推事件', '主角红线', '身份/金手指对齐', '反派逻辑', '反派分量', '反派自我叙事', '反派层级退场', '角色行为硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('protagonist_composure_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('strong_association_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('motivation_specificity_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('antagonist_weight_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('antagonist_self_story_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('antagonist_tier_exit_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('supporting_role_exit_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('behavior_repeat_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('character_driven_event_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('protagonist_red_line_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('identity_goldfinger_alignment_rules')
    expect(warnReport.next_actions.join('；')).toContain('强关联')
    expect(warnReport.next_actions.join('；')).toContain('动机链')
    expect(warnReport.next_actions.join('；')).toContain('起因具体')
    expect(warnReport.next_actions.join('；')).toContain('低级挑衅')
    expect(warnReport.next_actions.join('；')).toMatch(/反派分量|真实威胁/)
    expect(warnReport.next_actions.join('；')).toMatch(/反派自我叙事|自己的故事/)
    expect(warnReport.next_actions.join('；')).toMatch(/反派层级|退场/)
    expect(warnReport.next_actions.join('；')).toContain('人推事件')
    expect(warnReport.next_actions.join('；')).toContain('行为重复点')
  })

  test('story state sync persists a character_behavior_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'character_behavior_sync', payloadKey: 'character_behavior_sync'")
    expect(source).toContain('buildCharacterBehaviorSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.character_behavior_sync = characterBehaviorSync')
  })

  test('checks asset linkage contract delivery after chapter text is written', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 22, chapter_no: 22, title: '旧钥匙开缝' }
    const contextPackage = {
      chapter_target: {
        asset_linkage_contract: {
          version: 'oh_story_asset_linkage_v1',
          source: 'manual',
          key_assets: ['旧钥匙：祠堂禁门信物', '禁门规则：血契封条触发暗格'],
          linkage_plan: [
            '旧钥匙从信物变成证据，打开祠堂地砖暗格。',
            '禁门规则通过周薄森封口动作触发，逼出账本原件位置。',
          ],
          usage_rules: [
            '信息跟着冲突走：设定、物件、能力、势力必须通过事件、选择、阻碍或对话压力释放，不能整段说明。',
            '每个关键资产必须绑定功能、归属、触发条件、限制、后果。',
          ],
          state_tracking: ['旧钥匙归属从李玄私藏变成长老席见证，血契封条被触发后留下红印。'],
          three_appearance_plan: ['旧钥匙三次出现：袖口藏住，案上撞开暗格，章尾露出血契编号。'],
          forbidden_boundaries: ['不得提前揭露账本原件在地砖下。'],
          quality_checks: ['孤立资产检查：每个关键资产都必须与本章目标、冲突、回报或章尾钩子至少一项相连。'],
        },
      },
    }
    const linkedText = [
      '李玄把旧钥匙从袖口滑到掌心，先不解释它的来历，只让周薄森继续逼问证据来源。',
      '周薄森抢封祠堂禁门，血契封条被他按上去的一瞬间亮出红印，禁门规则在冲突里触发。',
      '旧钥匙撞上案角，钥齿裂开的缺口正好卡进地砖暗缝，暗格被撬开半寸。',
      '长老席看见钥匙从李玄私藏变成当堂证据，旁观者的站位跟着改了。',
      '代价也落下：红印记住了开门人，李玄若带走钥匙，下一次禁门会直接锁死他。',
      '章尾，旧钥匙第三次出现，裂缝里露出的血契编号指向账本原件在祠堂地砖下。',
    ].join('\n')
    const isolatedText = [
      '旧钥匙很重要，它有很多复杂来历。',
      '禁门规则也很重要，血契封条、暗格、编号、祠堂地砖都有一整套设定。',
      '大家站在厅里说了很久，旧钥匙被反复提起，但没有人真的使用它。',
      '周薄森忽然承认账本原件在地砖下，事情就解决了。',
      '本章还顺便介绍了盐契暗码、夜巡司令牌、族谱黑页和禁门钟声。',
    ].join('\n')

    const okReport = buildAssetLinkageSyncReport(project, chapter, contextPackage, linkedText)
    const warnReport = buildAssetLinkageSyncReport(project, chapter, contextPackage, isolatedText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('资产挂钩 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['关键资产', '功能链', '状态变化', '贯穿道具', '信息随冲突']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('资产挂钩缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['功能链', '孤立资产', '资产挂钩硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('孤立资产')
  })

  test('checks relationship graph risks after chapter text is written', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 24, chapter_no: 24, title: '血契编号' }
    const contextPackage = {
      chapter_target: {
        asset_linkage_contract: {
          version: 'oh_story_asset_linkage_v1',
          source: 'relationship_graph',
          relationship_graph_risks: [
            '旧钥匙(isolated_key_asset)：旧钥匙还没有和其他核心资产建立关系',
            '禁门规则(missing_owner)：缺少拥有者，无法判断由谁触发和承担代价',
          ],
          quality_checks: ['关系图诊断：不得让这些资产继续孤立、缺归属或悬空引用。'],
        },
      },
    }
    const linkedText = [
      '第一次，李玄把旧钥匙压进禁门锁眼，没有解释来历，只让周薄森继续逼问。',
      '钥齿触发禁门规则，血契封条亮起红印，规则的归属当场落到李玄手上。',
      '中段，旧钥匙和禁门规则连在一起：钥匙证明旧铺继承权，规则反过来锁死伪造账本的人，意义从信物变成当堂证据。',
      '代价也落下，李玄若拔走钥匙，下一次禁门会先锁住他的右手。',
      '结尾，旧钥匙第三次出现，裂开的钥齿露出血契编号，把下一章的账本原件钩出来。',
    ].join('\n')
    const isolatedText = [
      '旧钥匙很重要，禁门规则也很重要。',
      '大家都知道它们和关系图有关，但没有人使用旧钥匙，也没人说明禁门规则归谁触发。',
      '这些设定被反复提起，事情很快就解决了。',
    ].join('\n')

    const okReport = buildAssetLinkageSyncReport(project, chapter, contextPackage, linkedText)
    const warnReport = buildAssetLinkageSyncReport(project, chapter, contextPackage, isolatedText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('关系图风险')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('relationship_graph_risks')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('关系图风险')
    expect(warnReport.next_actions.join('；')).toContain('关系图风险')
  })

  test('story state sync persists an asset_linkage_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'asset_linkage_sync', payloadKey: 'asset_linkage_sync'")
    expect(source).toContain('buildAssetLinkageSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.asset_linkage_sync = assetLinkageSync')
  })

  test('wires deterministic asset linkage hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicAssetLinkageChecks = [buildAssetLinkageDeterministicCheck(contextPackage, chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicAssetLinkageChecks')
  })

  test('checks state tracking contract delivery after chapter text is written', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 23, chapter_no: 23, title: '地砖原件' }
    const contextPackage = {
      chapter_target: {
        state_tracking_contract: {
          version: 'oh_story_state_tracking_v1',
          source: 'manual',
          character_states: [
            '李玄：左臂旧伤未愈，残阵只能维持三息，持有旧钥匙。',
            '林青禾：公开作证后被周家盯上，只能用封条事实说话。',
          ],
          historical_causality: [
            '上一章旧钥匙裂开缺口，指向祠堂地砖下的账本原件。',
            '第13章血契封条规则已经确认：红印会记录开门人。',
          ],
          world_constraints: [
            '禁门规则：血契封条被触发后三息内必须退出，否则禁门会锁死开门人。',
            '知识边界：李玄不知道账本原件最后一页的第二枚血契编号。',
          ],
          source_requirements: ['本章细纲/场景卡', '上一章正文或上一章承接', '追踪/角色状态.md', '追踪/伏笔.md', '追踪/时间线.md'],
          source_readiness: [
            { key: 'chapter_blueprint', label: '本章细纲', status: 'ready', evidence: '地砖原件场景卡已确认。' },
            { key: 'previous_chapter', label: '上一章正文', status: 'ready', evidence: '旧钥匙裂开缺口。' },
            { key: 'character_state', label: '角色状态', status: 'ready', evidence: '李玄左臂旧伤；林青禾公开作证。' },
            { key: 'world_constraints', label: '世界约束', status: 'ready', evidence: '禁门三息锁死规则。' },
          ],
          filter_rules: ['只保留如果不知道这个本章会写错的信息。'],
          quality_checks: ['角色状态、前史因果和世界约束必须在正文中可见承接。'],
        },
      },
    }
    const trackedText = [
      '李玄左臂旧伤还没好，抬起旧钥匙时手指明显慢了半拍。',
      '他记得上一章旧钥匙裂开的缺口，那道缺口正对祠堂地砖下的暗缝。',
      '林青禾公开作证后已经被周家盯上，所以她没有解释，只把封条事实放到长老席前。',
      '血契封条被触发，禁门规则开始计三息：三息内不退出，开门人会被锁死。',
      '李玄的残阵只能维持三息，他不知道账本原件最后一页还有第二枚血契编号，只能先撬开暗格。',
      '红印记住开门人，账本原件露出时，第二枚血契编号才在最后一页亮出来。',
    ].join('\n')
    const driftText = [
      '李玄左臂完全好了，残阵可以一直维持，他轻松把禁门推开。',
      '林青禾像从没作证一样站在人群外，没有被周家盯上。',
      '旧钥匙裂开的缺口没有任何影响，上一章发生了什么并不重要。',
      '禁门规则这次没有生效，李玄想待多久就待多久。',
      '他早就知道账本原件最后一页有第二枚血契编号。',
      '本章还介绍了祠堂三百年历史、十二支旁系、盐契制度和夜巡司完整来历。',
    ].join('\n')

    const okReport = buildStateTrackingSyncReport(project, chapter, contextPackage, trackedText)
    const warnReport = buildStateTrackingSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('状态跟踪 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['角色状态', '前史因果', '世界约束', '来源就绪']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('状态跟踪缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['角色状态', '世界约束', '状态跟踪硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('状态')
  })

  test('story state sync persists a state_tracking_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'state_tracking_sync', payloadKey: 'state_tracking_sync'")
    expect(source).toContain('buildStateTrackingSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.state_tracking_sync = stateTrackingSync')
  })

  test('wires deterministic state tracking hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicStateTrackingChecks = [buildStateTrackingDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicStateTrackingChecks')
  })

  test('checks intent confirmation contract delivery after chapter text is written', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 24, chapter_no: 24, title: '第二枚编号' }
    const contextPackage = {
      chapter_target: {
        intent_confirmation_contract: {
          version: 'oh_story_intent_confirmation_v1',
          source: 'manual',
          confirmed_intent: '信息差反杀：李玄用第二枚血契编号夺回审讯解释权',
          rhythm_and_style: ['三轮压问', '短句反击', '爆发后冷却承接'],
          structure_inputs: [
            '内容概括：周薄森三轮压问证据来源，李玄用第二枚血契编号反证。',
            '逻辑线：压问升级 -> 短句反击 -> 信息差反杀 -> 代价收益落地 -> 章尾追问封条来源。',
            '出场顺序：周薄森先逼问，林青禾冒险作证，李玄最后亮出编号。',
            '代价/收益：林青禾公开得罪会长，李玄夺回解释权并拿到反证入口。',
            '章尾承接：第二枚编号指向林青禾封条来源。',
          ],
          execution_focus: ['爽点出手前先铺危机/期待', '信息差反应可见'],
          dialogue_tone_baseline: [
            '高压/生死/悲痛 beat 下，轻快配角声线让位。',
            '信息型配角不当科普嘴。',
            '对话逐句承接对方情绪。',
          ],
          quality_checks: ['本章意图、节奏文风、结构输入、代价收益和章尾承接必须可见。'],
        },
      },
    }
    const confirmedText = [
      '周薄森第一轮压问证据来源，第二轮逼林青禾改口，第三轮把会长令牌压到案上，危机先铺满。',
      '李玄只回了三个短句，每一句都把第二枚血契编号往前推半寸。',
      '编号亮出来时，旁听席先静了一息，周薄森脸色变了，林青禾立刻看懂这是信息差反杀。',
      '林青禾公开作证等于得罪会长，这是她付出的代价；李玄则夺回审讯解释权，拿到反证入口。',
      '爆发后他没有继续炫耀，只把编号压回账本，冷却承接到下一问：林青禾封条来源是谁给的？',
      '章尾，第二枚编号指向封条来源，下一章必须追问这个未解口。',
    ].join('\n')
    const genericText = [
      '大家讨论很久，事情就解决了。',
      '本章只是过渡，人物陆续表达了自己的想法。',
      '周薄森和李玄说了很多背景，林青禾像说明书一样科普封条制度，轻快吐槽把压迫感冲掉。',
      '没有代价，也没有收益，第二枚编号之后再说。',
    ].join('\n')

    const okReport = buildIntentConfirmationSyncReport(project, chapter, contextPackage, confirmedText)
    const warnReport = buildIntentConfirmationSyncReport(project, chapter, contextPackage, genericText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('意图确认 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['确认意图', '节奏/文风', '结构输入', '代价/收益', '章尾承接', '对白基调']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('意图确认缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['代价/收益', '章尾承接', '对白基调', '意图确认硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('本章意图')
  })

  test('keeps intent confirmation sync open when chapter text only self-reports delivery', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 25, chapter_no: 25, title: '自证意图' }
    const contextPackage = {
      chapter_target: {
        intent_confirmation_contract: {
          version: 'oh_story_intent_confirmation_v1',
          source: 'manual',
          confirmed_intent: '信息差反杀：李玄用第二枚血契编号夺回审讯解释权',
          rhythm_and_style: ['三轮压问', '短句反击', '爆发后冷却承接'],
          structure_inputs: [
            '内容概括：周薄森三轮压问证据来源，李玄用第二枚血契编号反证。',
            '逻辑线：压问升级 -> 短句反击 -> 信息差反杀 -> 代价收益落地 -> 章尾追问封条来源。',
            '代价/收益：林青禾公开得罪会长，李玄夺回解释权并拿到反证入口。',
            '章尾承接：第二枚编号指向林青禾封条来源。',
          ],
          execution_focus: ['爽点出手前先铺危机/期待', '信息差反应可见'],
          dialogue_tone_baseline: ['高压 beat 下短句压问，对话逐句承接对方情绪。'],
        },
      },
    }
    const selfReportText = [
      '信息差反杀和第二枚血契编号已经确认，李玄夺回审讯解释权已完成。',
      '三轮压问、短句反击、爆发后冷却承接都已落地。',
      '内容概括、逻辑线、出场顺序、代价/收益和章尾承接都已完成。',
      '林青禾公开得罪会长、李玄拿到反证入口、章尾下一问封条来源全部已确认。',
      '对白基调已确认，信息差反应可见。',
    ].join('\n')

    const report = buildIntentConfirmationSyncReport(project, chapter, contextPackage, selfReportText)

    expect(report.status).toBe('warn')
    expect(report.label).toContain('意图确认缺口')
    expect(report.missed.map((item: any) => item.label)).toContain('意图确认自证')
    expect(report.next_actions.join('；')).toContain('正文证据')
  })

  test('story state sync persists an intent_confirmation_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'intent_confirmation_sync', payloadKey: 'intent_confirmation_sync'")
    expect(source).toContain('buildIntentConfirmationSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.intent_confirmation_sync = intentConfirmationSync')
  })

  test('wires deterministic intent confirmation hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicIntentConfirmationChecks = [buildIntentConfirmationDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicIntentConfirmationChecks')
  })

  test('checks continuity heat contract delivery after chapter text is written', () => {
    const project = { title: '午夜校规' }
    const chapter = { id: 26, chapter_no: 26, title: '门外水声' }
    const contextPackage = {
      chapter_target: {
        continuity_heat_contract: {
          version: 'oh_story_continuity_heat_v1',
          source: 'manual',
          heat_states: ['hot：门外水声必须推进成当场压力', 'warm：旧钥匙缺口需要触达一次', 'cold：镜中脚印回收前必须先升温', 'archived：夜巡司令牌不得误激活'],
          active_expectations: ['门外水声必须继续施压，逼李辰在十息内开门或换路。'],
          watch_items: ['旧钥匙缺口需要回收', '镜中脚印是谁留下的', '李辰和室友互信线不能断温'],
          dormant_allowed: ['夜巡司令牌本章休眠，不能突然解决门外水声。'],
          quality_checks: ['hot 必须推进，warm 必须触达，cold 回收前必须升温，archived 不得误激活。'],
        },
      },
    }
    const heatedText = [
      '门外水声贴着门缝往里灌，十息倒计时压下来，李辰被迫放弃正门，改从窗沿绕到值夜室。',
      '他摸到旧钥匙缺口时停了一下，缺口正好卡住门锁里那道新划痕，旧钥匙没有消失，而是把线索往前推了一寸。',
      '镜中脚印没有立刻揭开身份，只在玻璃上多出半枚湿鞋印，先把这条冷线升温。',
      '室友没有被甩在背景里，他按住广播线替李辰争来三息，互信线继续被触达。',
      '夜巡司令牌始终躺在抽屉里，没有突然替他们解决门外水声。',
    ].join('\n')
    const coldText = [
      '门外水声暂时不重要，大家讨论了一会儿就换了话题。',
      '旧钥匙缺口、镜中脚印和室友关系以后再说。',
      '李辰忽然掏出夜巡司令牌，令牌亮了一下，门外水声立刻消失，事情就解决了。',
      '本章只是过渡，没有必要处理那些伏笔。',
    ].join('\n')

    const okReport = buildContinuityHeatSyncReport(project, chapter, contextPackage, heatedText)
    const warnReport = buildContinuityHeatSyncReport(project, chapter, contextPackage, coldText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('连续性热度 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['热度状态', '活跃期待', '关注项', '休眠边界']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('连续性热度缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['活跃期待', '关注项', '休眠边界', '连续性热度硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('伏笔')
  })

  test('story state sync persists a continuity_heat_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: continuityHeatSync, reviewType: 'continuity_heat_sync'")
    expect(source).toContain('buildContinuityHeatSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.continuity_heat_sync = continuityHeatSync')
  })

  test('wires deterministic continuity heat hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicContinuityHeatChecks = [buildContinuityHeatDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicContinuityHeatChecks')
  })

  test('wires deterministic conflict structure hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicConflictStructureChecks = [buildConflictStructureDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicConflictStructureChecks')
  })

  test('checks conflict structure contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 28, chapter_no: 28, title: '设备间门口' }
    const contextPackage = {
      chapter_target: {
        conflict_structure_contract: {
          version: 'oh_story_conflict_structure_v1',
          source: 'manual',
          conflict_ladder: [
            '言语->行动->激烈对抗->决定胜负',
            '协会成员挡住设备间门口，先质疑资格，再扣设备钥匙，最后叫保安封门。',
          ],
          motivation_sources: ['金手指：隐藏工具箱给出错误码反证。', '世界背景：协会资质规则卡住设备间权限。'],
          antagonist_pressure_rules: ['压势不压人：协会成员依靠规则、资质和设备权限压主角。'],
          protagonist_agency_rules: ['主角必须主动破局，做别人不敢做：当众拆开封条核验错误码。'],
          event_value_changes: ['客户资格从拒绝到认可，协会封门从压制变成失证。'],
          next_conflict_seeds: ['第二份封单指向医院设备，协会会长亲自追责。'],
          quality_checks: ['冲突必须持续升级，有明确结果和下一冲突种子。'],
        },
      },
    }
    const structuredText = [
      '协会成员先冷声质疑他没有资质，话音刚落就把设备间门口堵住。',
      '主角往前一步，协会成员立刻扣下设备钥匙，又叫保安封门，言语压力升级成行动阻碍。',
      '主角非踏入不可：客户设备停摆会让全楼停电，他作为值班维修师不能撤；协会封单是会长亲自下的工作职责，对方也退不了。',
      '死亡赌注压在眼前，失败就等于旧城维修资格归零，身份/职场死亡会当场落下。',
      '对方不是单纯骂人，而是拿协会资质规则和设备权限压住客户，客户也被迫后退。',
      '主角没有等人通融，他当众拆开封条，用隐藏工具箱读出错误码反证，做了旁人不敢做的核验。',
      '激烈对抗后胜负落地：客户资格从拒绝到认可，协会封门从压制变成失证。',
      '章尾，第二份封单指向医院设备，协会会长亲自追责，下一冲突种子已经点燃。',
    ].join('\n')
    const flatText = [
      '大家争执了一会儿，协会成员态度不好。',
      '主角解释了很多背景，客户听完觉得有道理。',
      '没有真正阻力，也没有明确胜负，事情很快解决了。',
      '本章只是过渡，下一章再安排新的冲突。',
    ].join('\n')

    const okReport = buildConflictStructureSyncReport(project, chapter, contextPackage, structuredText)
    const warnReport = buildConflictStructureSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('冲突结构 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['冲突阶梯', '动机来源', '压势规则', '主角行动力', '胜负变化', '下一冲突']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('冲突结构缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['冲突阶梯', '主角行动力', '胜负变化', '冲突结构硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('阻止者')
  })

  test('checks oh-story conflict web lines after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 29, chapter_no: 29, title: '医院封单' }
    const contextPackage = {
      chapter_target: {
        conflict_structure_contract: {
          version: 'oh_story_conflict_structure_v1',
          source: 'manual',
          conflict_ladder: ['协会封锁设备间权限，主角必须当场破局。'],
          motivation_sources: ['世界背景：协会资质规则卡住设备间权限。', '人物关系：林青禾担保主角进入医院设备间。'],
          antagonist_pressure_rules: ['压势不压人：协会用资质规则、医院封单和客户授权施压。'],
          protagonist_agency_rules: ['主角必须主动核验错误链，不能等客户通融。'],
          event_value_changes: ['解决设备间权限后，医院封单追责升级。'],
          next_conflict_seeds: ['医院封单背后指向协会账本。'],
          conflict_web: {
            active_lines: ['设备间权限线', '医院封单追责线', '林青禾担保关系线'],
            link_rules: ['三条线必须通过因果、利益冲突或信息差互相牵连。'],
            activation_rules: ['解决设备间权限线后，必须激活或加深医院封单追责线或林青禾担保关系线。'],
          },
          quality_checks: ['同一时刻保持2-3条矛盾线同时运行，解决一条必须激活或加深另一条。'],
        },
      },
    }
    const webText = [
      '协会用资质规则封锁设备间权限，设备间权限线先压住主角。',
      '林青禾以个人名义担保他进入医院设备间，担保关系线同时承压。',
      '主角非踏入不可：医院设备停摆会影响病区供电，他有工作职责；协会封单来自会长命令，对方也退不了。',
      '退出代价很清楚，主角若失败就是维修资格归零，身份/职场死亡，林青禾的担保也会被追责。',
      '主角主动核验错误链，靠信息差证明封锁规则被协会账本篡改。',
      '设备间权限线阶段解决，但结果没有让麻烦消失：医院封单追责线立刻升级，协会会长要求追查林青禾担保责任。',
      '三条矛盾线形成因果和利益冲突，医院封单背后继续指向协会账本。',
    ].join('\n')
    const singleLineText = [
      '协会封锁设备间权限，主角核验后权限问题解决。',
      '主角非踏入不可：医院设备停摆影响病区供电，他有工作职责；协会封单来自会长命令，对方也退不了。',
      '失败就是维修资格归零，身份/职场死亡会当场落下。',
      '其他矛盾暂时没有关联，也没有新的利益冲突。',
      '解决后没有激活新矛盾，林青禾担保关系线和医院封单追责线都没有继续施压。',
    ].join('\n')

    const okReport = buildConflictStructureSyncReport(project, chapter, contextPackage, webText)
    const warnReport = buildConflictStructureSyncReport(project, chapter, contextPackage, singleLineText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('矛盾网')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补矛盾网')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('conflict_web')
    expect(warnReport.next_actions.join('；')).toContain('激活或加深')
  })

  test('checks oh-story three-layer conflict network after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 31, chapter_no: 31, title: '协会账本' }
    const contextPackage = {
      chapter_target: {
        conflict_structure_contract: {
          version: 'oh_story_conflict_structure_v1',
          source: 'manual',
          conflict_ladder: ['协会封锁账本权限，主角必须当场破局。'],
          motivation_sources: ['世界背景：协会资质规则卡住账本权限。', '人物关系：林青禾担保主角查账。'],
          antagonist_pressure_rules: ['压势不压人：协会会长用上下级权限和账本保管规则施压。'],
          protagonist_agency_rules: ['主角必须主动核验账本错账，不能等客户通融。'],
          event_value_changes: ['账本权限从拒绝到开放，林青禾担保从帮忙变成被追责。'],
          next_conflict_seeds: ['协会会长把追责转向林青禾的担保资格。'],
          conflict_web: {
            active_lines: ['会长权限压制线', '同业抢单竞争线', '担保资格牵连线'],
            link_rules: ['三条线必须通过因果、利益冲突或信息差互相牵连。'],
            activation_rules: ['解决账本权限后，必须激活或加深担保资格牵连线。'],
          },
          conflict_network_layers: {
            vertical_conflict: '纵向矛盾：协会会长以上级权限压主角和林青禾服从。',
            horizontal_conflict: '横向矛盾：同业维修师争夺旧城医院订单和客户授权。',
            cross_conflict: '交叉矛盾：主角破解账本会让林青禾担保资格被会长追责。',
            weaving_order: ['定地图：旧城协会账本室', '定阵营：协会、同业维修师、林青禾担保方', '定角色：会长压制、同业抢单、主角查账'],
          },
          quality_checks: ['长篇冲突网络必须同时保留纵向、横向、交叉三层矛盾。'],
        },
      },
    }
    const layeredText = [
      '地图定在旧城协会账本室，阵营很清楚：协会、同业维修师和林青禾担保方都挤在门口。',
      '纵向矛盾先压下来：协会会长用上下级权限要求林青禾撤回担保，主角也必须服从账本保管规则。',
      '横向矛盾同时发作：同业维修师争夺旧城医院订单和客户授权，想把主角挤出这单。',
      '交叉矛盾把三方牵连起来：主角破解账本错账会让林青禾担保资格被会长追责，也会让同业抢单失去理由。',
      '主角非踏入不可，他作为值班维修师有工作职责，失败就是维修资格归零；会长封存账本是亲自下的职责命令，对方也退不了。',
      '主角主动核验账本错账，解决账本权限后，担保资格牵连线立刻被激活，会长当场追责林青禾。',
      '三层矛盾不是并列清单，而是因果、利益冲突和信息差互相咬住。',
    ].join('\n')
    const flatText = [
      '协会会长挡了一下账本，主角解释后问题解决。',
      '本章只有账本权限这一条冲突，其他阵营暂时没有关联。',
      '同业维修师没有竞争，林青禾担保也没有被牵连。',
      '解决后没有激活新矛盾。',
    ].join('\n')

    const okReport = buildConflictStructureSyncReport(project, chapter, contextPackage, layeredText)
    const warnReport = buildConflictStructureSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('三层矛盾网')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补三层矛盾网')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('conflict_network_layers')
    expect(warnReport.missed.find((item: any) => item.key === 'conflict_network_layers')?.missed_items).toEqual(expect.arrayContaining([
      '缺纵向矛盾',
      '缺横向矛盾',
      '缺交叉矛盾',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('纵向/横向/交叉')
  })

  test('checks oh-story no-exit conflict glue after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 30, chapter_no: 30, title: '锁死的设备间' }
    const contextPackage = {
      chapter_target: {
        conflict_structure_contract: {
          version: 'oh_story_conflict_structure_v1',
          source: 'manual',
          conflict_ladder: ['协会封锁设备间权限，主角必须当场破局。'],
          motivation_sources: ['世界背景：协会资质规则卡住设备间权限。', '人物关系：客户设备停摆会让全楼停电。'],
          antagonist_pressure_rules: ['压势不压人：协会用资质规则、设备间封锁和客户授权施压。'],
          protagonist_agency_rules: ['主角必须主动核验错误链，不能等客户通融。'],
          event_value_changes: ['解决封锁后，客户资格从拒绝到认可。'],
          next_conflict_seeds: ['医院封单背后指向协会账本。'],
          no_exit_rules: [
            '有进无出：读者必须相信主角非踏入不可，不能随时退出。',
            '死亡赌注必须明确：肉体死亡、身份/职场死亡或心理死亡至少一种贯穿。',
            '冲突必须有黏结剂：杀人理由、工作职责、道德责任或实体场所至少命中一种。',
          ],
          quality_checks: ['对立双方必须无法轻易脱身。'],
        },
      },
    }
    const gluedText = [
      '设备间门从外侧锁死，实体场所把双方都困在走廊尽头。',
      '主角非踏入不可：客户设备停摆会让全楼停电，他作为值班维修师有工作职责，不能撤。',
      '协会成员也退不了，封单是会长亲自下的工作职责，若让主角进门，协会资质造假就会当场失证。',
      '死亡赌注不是喊口号：失败就等于主角旧城维修资格归零，身份/职场死亡压在眼前。',
      '主角主动核验错误链，解决封锁后客户资格从拒绝到认可，但医院封单背后继续指向协会账本。',
    ].join('\n')
    const looseText = [
      '协会成员拦了一下，主角其实可以转身离开。',
      '对方也随时能撤，没有工作职责、没有场所封锁，也没有亲友遇险。',
      '失败没有代价，身份资格不会受影响，事情只是普通争吵。',
    ].join('\n')

    const okReport = buildConflictStructureSyncReport(project, chapter, contextPackage, gluedText)
    const warnReport = buildConflictStructureSyncReport(project, chapter, contextPackage, looseText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('有进无出')
    expect(okReport.missed.map((item: any) => item.key)).not.toContain('no_exit_rules')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补有进无出')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('no_exit_rules')
    expect(warnReport.missed.find((item: any) => item.key === 'no_exit_rules')?.missed_items).toEqual(expect.arrayContaining([
      '缺强迫性入局理由',
      '缺死亡赌注/退出代价',
      '缺黏结剂',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('非踏入不可')
  })

  test('story state sync persists a conflict_structure_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: conflictStructureSync, reviewType: 'conflict_structure_sync'")
    expect(source).toContain('buildConflictStructureSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.conflict_structure_sync = conflictStructureSync')
  })

  test('checks upgrade rhythm contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 30, chapter_no: 30, title: '隐藏工具箱' }
    const contextPackage = {
      chapter_target: {
        upgrade_rhythm_contract: {
          version: 'oh_story_upgrade_rhythm_v1',
          source: 'manual',
          upgrade_gap: ['升级前缺口：客户质疑主角没有资格，设备间权限被协会卡住。'],
          upgrade_gain_plan: ['升级收获：系统解锁隐藏工具箱，客户主动加价并恢复授权。'],
          feedback_loop: ['即时反馈：系统提示熟练度+10，主角当场识别错误码。', '延迟反馈：第二份封单指向医院设备，触发更高门槛。'],
          emotion_modules: ['装逼：被质疑 -> 展示能力 -> 打造落差 -> 旁观者震惊。'],
          bridge_rhythm: ['四章一桥段：本章兑现爽感并承上启下。'],
          goldfinger_simplicity_rules: [
            '金手指简单是核心：游戏化面板一眼就懂最好。',
            '功能、触发条件、奖励反馈和升级规则必须清晰。',
            '本章只展示一种核心用法，避免把系统写成说明书或万能外挂。',
          ],
          goldfinger_multi_dimension_growth_rules: [
            '金手指提升要有多维度，不能只靠单一维度。',
            '词条、功能、品质至少两条线同时成长，提升感才不会消失。',
            '条件-反馈模型要保留：条件升级后，反馈可解锁新功能或子能力。',
          ],
          ranking_ladder_rules: [
            '排行榜提供升级动力：排名提升要让读者期待下一名次。',
            '通过排行榜介绍新对手，制造下一次碰撞期待。',
            '榜单出现后要有装逼余震，影响后续态度、资源或规则评价。',
          ],
          quality_checks: ['升级后必须展示以前做不到的事，并立刻引入更高门槛。'],
        },
      },
    }
    const upgradedText = [
      '客户一开始质疑他没有资格，协会又把设备间权限卡住，升级前缺口压得很清楚。',
      '系统提示熟练度+10，隐藏工具箱解锁，主角第一次一眼识别出设备错误码。',
      '这套金手指简单清晰：面板只显示错误码、拆解路线、熟练度+10和下一门槛，触发条件就是接触设备，读者一眼就懂。',
      '这次升级不是只把品质+1：新增词条“静音校准”，隐藏工具箱解锁新功能，旧零件品质升到A档，条件仍是完成维修订单，反馈从熟练度变成词条、功能、品质三线成长。',
      '他以前只能听设备异响猜问题，现在能直接看见隐藏线路的断点，当场修复封锁模块。',
      '客户主动加价并恢复授权，旁观者震惊地改口，装逼爽点从被质疑转成展示能力。',
      '协会维修榜随即刷新，主角从榜外升到第九十九名，第九十八名的医院设备师名字第一次亮出来。',
      '榜单余震传开，客户群开始重新报价，协会规则评价也改写，下一轮排名碰撞有了目标。',
      '但延迟反馈也跟上：第二份封单指向医院设备，新的红色警报和更高门槛立刻压下来。',
      '本章完成兑现爽感，同时把桥段承上启下接到医院设备。',
    ].join('\n')
    const hollowText = [
      '系统突然升级，奖励到账。',
      '面板一口气弹出十几种模块、天赋、羁绊、规则树和隐藏权限，没人知道触发条件和升级规则。',
      '系统只把品质从A升到S，又从S升到SS，其他词条、功能、条件反馈都没有变化，提升只剩品质一个维度。',
      '大家都点头，客户觉得不错。',
      '没有展示新能力，也没有以前做不到的事。',
      '没有新门槛，事情到这里结束。',
    ].join('\n')

    const okReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, upgradedText)
    const warnReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, hollowText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('升级节奏 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['升级前缺口', '升级收获', '反馈闭环', '情绪模块', '桥段节奏', '金手指简单清晰', '金手指多维成长', '榜单升级动力']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('升级节奏缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['升级前缺口', '反馈闭环', '金手指简单清晰', '金手指多维成长', '升级节奏硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_simplicity_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_multi_dimension_growth_rules')
    expect(warnReport.next_actions.join('；')).toContain('新能力')
    expect(warnReport.next_actions.join('；')).toContain('一眼就懂')
    expect(warnReport.next_actions.join('；')).toContain('词条、功能、品质')
  })

  test('checks oh-story ranking ladder after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 34, chapter_no: 34, title: '榜外入榜' }
    const contextPackage = {
      chapter_target: {
        upgrade_rhythm_contract: {
          version: 'oh_story_upgrade_rhythm_v1',
          source: 'manual',
          ranking_ladder_rules: [
            '排行榜提供升级动力：排名提升要让读者期待下一名次。',
            '通过排行榜介绍新对手，制造下一次碰撞期待。',
            '榜单出现后要有装逼余震，影响后续态度、资源或规则评价。',
          ],
        },
      },
    }
    const rankingText = [
      '协会维修榜刷新，沈砚从榜外升到第九十九名，读者能看到下一步要冲第九十八名。',
      '榜单同时亮出新对手：第九十八名医院设备师周承，他刚接下红色封单。',
      '这次入榜有装逼余震，客户群开始重新报价，协会规则评价也改写，下一章的排名碰撞被挂上。',
    ].join('\n')
    const hollowRankingText = [
      '协会维修榜刷新，沈砚排名提升到第九十九名。',
      '众人看了一眼榜单，事情结束。',
    ].join('\n')

    const okReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, rankingText)
    const warnReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, hollowRankingText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('榜单升级动力')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补榜单升级动力')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('ranking_ladder_rules')
    expect(warnReport.next_actions.join('；')).toContain('新对手')
    expect(warnReport.next_actions.join('；')).toContain('装逼余震')
  })

  test('warns when goldfinger evolution changes core function without foreshadowing', () => {
    const project = {
      title: '旧城设备师',
      reference_config: {
        writing_bible: {
          golden_finger: '维修系统：识别设备错误码并给出拆解路线',
        },
      },
    }
    const chapter = { id: 32, chapter_no: 32, title: '系统升阶' }
    const contextPackage = {
      chapter_target: {
        upgrade_rhythm_contract: {
          version: 'oh_story_upgrade_rhythm_v1',
          source: 'manual',
          upgrade_gap: ['协会设备规则升级，旧错误码无法直接修复医院封单。'],
          upgrade_gain_plan: ['维修系统从识别错误码发展为联动医院设备规则。'],
          feedback_loop: ['即时反馈：系统识别医院设备的隐藏错误链。', '延迟反馈：下一章需要进入医院机房验证规则源头。'],
          emotion_modules: ['装逼：别人以为他只会修旧设备，他用同一套维修系统处理医院设备规则。'],
          bridge_rhythm: ['升级后引出医院机房新门槛。'],
          quality_checks: ['金手指核心作用可发展但不能突然换赛道；升华到世界规则层级必须有伏笔。'],
          goldfinger_evolution: {
            core_function: '识别设备错误码并给出拆解路线',
            current_stage: '发展',
            allowed_extensions: ['联动医院设备规则', '识别隐藏错误链'],
            forbidden_drifts: ['血脉神通', '天道掌控'],
          },
        },
      },
    }
    const evolvedText = [
      '协会设备规则升级，旧错误码无法直接修复医院封单。',
      '维修系统没有换赛道，仍然围绕识别设备错误码给出拆解路线，只是发展到能联动医院设备规则。',
      '系统当场识别医院设备的隐藏错误链，主角用同一套维修逻辑拆出机房权限缺口。',
      '延迟反馈也压下来：下一章必须进入医院机房验证规则源头。',
    ].join('\n')
    const driftText = [
      '维修系统突然升级成血脉神通，主角不再识别错误码，也不需要拆解设备。',
      '他一步掌控天道，所有医院设备和旧城规则都跪伏下来。',
      '此前没有任何伏笔，金手指核心作用彻底改变。',
    ].join('\n')

    const okReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, evolvedText)
    const warnReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('金手指演进')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先校准金手指演进')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_evolution_drift')
    expect(warnReport.next_actions.join('；')).toContain('核心作用')
  })

  test('checks goldfinger conflict balance in upgrade rhythm after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 33, chapter_no: 33, title: '第一单翻身' }
    const contextPackage = {
      chapter_target: {
        upgrade_rhythm_contract: {
          version: 'oh_story_upgrade_rhythm_v1',
          source: 'manual',
          upgrade_gap: ['客户质疑主角没有资格碰进口设备。'],
          upgrade_gain_plan: ['系统识别隐藏错误码，主角修好进口设备。'],
          feedback_loop: ['即时反馈：系统提示熟练度+10。', '延迟反馈：医院设备出现更高门槛。'],
          emotion_modules: ['装逼：被质疑 -> 展示能力 -> 旁观者震惊。'],
          bridge_rhythm: ['修好旧设备后接到医院设备新封单。'],
          goldfinger_conflict_balance_rules: [
            '金手指刚好解决当前矛盾。',
            '金手指太强 + 矛盾不够 = 无聊。',
            '金手指太弱 + 矛盾太强 = 读者焦虑。',
            '解决当前矛盾后必须暴露更大矛盾。',
          ],
        },
      },
    }
    const balancedText = [
      '客户质疑主角没有资格碰进口设备，协会权限也卡住设备间。',
      '维修系统刚好识别隐藏错误码，却只能给出拆解路线，主角还得亲手拆机验证。',
      '系统提示熟练度+10，进口设备被修好，客户主动加价，旁观者震惊。',
      '但系统没有一键清场，医院设备的新封单随即亮起红色警报，暴露更大矛盾和更高门槛。',
    ].join('\n')
    const overpoweredText = [
      '系统一键解决所有问题，所有进口设备和医院设备都自动修好。',
      '客户、协会和所有对手全部认输，当前矛盾彻底消失。',
      '没有更大矛盾，没有新门槛，事情到这里结束。',
    ].join('\n')

    const okReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, balancedText)
    const warnReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, overpoweredText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('金手指矛盾匹配')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先校准金手指矛盾')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_conflict_balance')
    expect(warnReport.next_actions.join('；')).toContain('暴露更大矛盾')
  })

  test('story state sync persists an upgrade_rhythm_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: upgradeRhythmSync, reviewType: 'upgrade_rhythm_sync'")
    expect(source).toContain('buildUpgradeRhythmSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.upgrade_rhythm_sync = upgradeRhythmSync')
  })

  test('checks target reader contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 31, chapter_no: 31, title: '旧钥匙缺口' }
    const contextPackage = {
      chapter_target: {
        target_reader_contract: {
          version: 'oh_story_target_reader_v1',
          source: 'manual',
          reader_profile: '18-30 岁碎片时间追更的番茄男频读者，现实中缺爽感、掌控感和快速反馈。',
          reader_desires: ['规则反制爽点', '智斗规则边界', '主角把不公平拿掉', '升级后即时反馈'],
          emotional_gap_analysis: [
            '核心痛苦：现实中缺爽感和掌控感，被规则压着走。',
            '深层情结：不甘被不公平规则安排，渴望亲手反制。',
            '高频情绪关键词：不甘、渴望、掌控、解气。',
            '未满足需求：快速反馈、安全感和尊严补偿。',
          ],
          chapter_attractions: ['超人蛮力被规则反制后，主角用信息差反制规则。', '门外水声逼出新选择，旧钥匙缺口给出可见线索。'],
          genre_vitality_rules: ['题材生命力必须用当前目标平台样本验证，判断新鲜期 / 成熟期 / 审美疲劳期，不能把历史经验当作当前事实。'],
          platform_fit_rules: ['不能用A网站的样本直接套到B网站；番茄要强情绪和爽感直给，起点可接受慢节奏代入。'],
          boundary_fit_rules: ['确认边界感：当前素材、知识储备和篇幅能支撑所选题材，成熟题材稳边界，创新题材降篇幅和创新数量。'],
          title_blurb_alignment_rules: ['书名3秒抓人，简介必须有安全感+钩子，书名简介内容三位一体，不能货不对板。'],
          immersion_plasticity_rules: ['正文必须有代入感且无塑料感：世界观自洽、画风统一，避免仙侠搞科研式撕裂。'],
          goldfinger_life_fit_rules: ['金手指必须与主角生活/职业息息相关，并服务主线，不要频繁开新金手指。'],
          commercial_expression_rules: ['私人表达不得超过全篇5%，且必须服务核心卖点，不能独立于主线剧情存在。'],
          validation_questions: ['我这书写给谁看？', '目标读者想看什么？', '本章给了什么可感知回报？'],
          correction_methods: ['对照目标读者画像删掉作者自嗨设定展示。', '把卖点落成动作、反应、结果和章尾期待。'],
          quality_checks: ['三问必须都有正文证据。'],
        },
      },
    }
    const readerFacingText = [
      '这一章写给碎片时间追更、想要快速反馈的男频读者看，主角一出手就把规则压迫变成现场反制。',
      '他的核心痛苦不是门打不开，而是现实里总被规则压着走的不甘；这一刻的情绪缺口，是读者渴望亲手拿回掌控感和尊严。',
      '协会搬出资质规则，超人蛮力刚要破门，主角却用信息差指出规则边界：钥匙缺口对应旧备案，不公平当场被拿掉。',
      '旧钥匙缺口在门框上亮出可见线索，门外水声逼出新选择，升级后的识别能力立刻给出即时反馈。',
      '客户的反应、协会的退让和章尾账本编号一起落成回报，也留下下一章必须追的章尾期待。',
      '当前番茄样本验证显示规则怪谈处在成熟期，所以本章稳定兑现边界期待，只做旧备案缺口这一处微创新。',
      '写法没有把起点慢节奏样本硬套到番茄，而是用强情绪、爽感直给和目标平台节奏校准读者期待与雷点。',
      '素材、知识储备和篇幅都压在宿舍规则和门槛白线内，边界感清晰，没有扩成无法支撑的宏大设定。',
      '书名的旧钥匙缺口、简介承诺的安全感加钩子、正文交付的门框线索三位一体，没有货不对板。',
      '世界观自洽，宿舍规则、备案钥匙和门外水声保持同一画风，代入感稳定，没有仙侠搞科研式塑料感。',
      '识别钥匙缺口的能力与主角设备师职业和当下生活处境息息相关，金手指服务主线而不是硬贴外挂。',
      '所有私人表达都服务核心卖点，没有超过5%去讲作者自己的观点。',
      '正文没有停在设定展示，而是把卖点写成动作、反应、结果。',
    ].join('\n')
    const selfIndulgentText = [
      '读者会喜欢这个设定。',
      '大家会喜欢这章。',
      '作者觉得世界观很有意思。',
      '本章主要展示设定，没有明显回报。',
      '题材曾经很火，所以不用当前样本验证，也不用判断新鲜期成熟期或审美疲劳期。',
      '直接把A网站慢热样本套到B网站，不需要看番茄强情绪或起点慢节奏的差异。',
      '素材、知识储备和篇幅都不够，但先硬写混搭大设定。',
      '书名、简介和正文可以各写各的，货不对板也没关系。',
      '仙侠世界突然搞科研，画风撕裂，塑料感很明显。',
      '医生主角配隐身金手指，和生活职业无关。',
      '作者私人表达占了很多篇幅，独立于主线卖点。',
    ].join('\n')

    const okReport = buildTargetReaderSyncReport(project, chapter, contextPackage, readerFacingText)
    const warnReport = buildTargetReaderSyncReport(project, chapter, contextPackage, selfIndulgentText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('目标读者 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining([
      '读者画像',
      '读者欲望',
      '情绪缺口',
      '本章吸引点',
      '题材生命力',
      '平台适配',
      '题材边界',
      '书名简介一致',
      '代入与塑料感',
      '金手指生活关联',
      '商业表达',
      '三问验证',
      '修正方法',
    ]))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('目标读者缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining([
      '读者欲望',
      '情绪缺口',
      '本章吸引点',
      '题材生命力',
      '平台适配',
      '题材边界',
      '书名简介一致',
      '代入与塑料感',
      '金手指生活关联',
      '商业表达',
      '目标读者硬伤',
    ]))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('emotional_gap_analysis')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('genre_vitality_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('platform_fit_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('title_blurb_alignment_rules')
    expect(warnReport.next_actions.join('；')).toMatch(/目标读者|可感知回报/)
    expect(warnReport.next_actions.join('；')).toContain('核心痛苦')
    expect(warnReport.next_actions.join('；')).toContain('目标平台样本')
    expect(warnReport.next_actions.join('；')).toContain('书名简介内容')
  })

  test('wires deterministic target reader hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicTargetReaderChecks = [buildTargetReaderDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicTargetReaderChecks')
  })

  test('story state sync persists a target_reader_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: targetReaderSync, reviewType: 'target_reader_sync'")
    expect(source).toContain('buildTargetReaderSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.target_reader_sync = targetReaderSync')
  })

  test('checks genre positioning contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师', genre: '都市系统逆袭' }
    const chapter = { id: 32, chapter_no: 32, title: '报废设备订单' }
    const contextPackage = {
      chapter_target: {
        genre_positioning_contract: {
          version: 'oh_story_genre_positioning_v1',
          source: 'manual',
          genre_label: '都市系统/逆袭长篇',
          reader_psychology: ['中年危机、经济压力和被轻视后的翻盘补偿。', '掌控感：把混乱生活量化成可升级、可验证、可反击的目标。'],
          genre_formula: ['低谷压迫 -> 系统面板 -> 小胜兑现 -> 新门槛出现。'],
          core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
          goldfinger_fit_rules: ['金手指必须贴合主角维修职业、设备订单和现实生活困境。'],
          must_have_scenes: ['系统面板首次给出刺眼评价或任务。', '质疑者/压力源在场，主角用结果反证。'],
          platform_fit_rules: ['番茄偏快节奏、强回报、清晰冲突和短周期爽点。'],
          micro_innovation_rules: ['微创新最多3个，必须服务都市系统逆袭模板。'],
          longboard_focus_rules: [
            '拉长板而非补短板：优先强化题材长板、核心卖点、目标情绪和最高频爽点。',
            '不得为补短板引入稀释核心卖点的支线。',
            '开书前检查：核心卖点背后的情绪清晰；同一卖点能延展出至少 3 个角度；题材长板与现有素材/对标资产匹配。',
          ],
          quality_checks: ['书名简介内容三位一体，系统逆袭承诺必须在正文场景兑现。'],
        },
      },
    }
    const positionedText = [
      '这一章继续都市系统逆袭长篇的承诺：失业后的中年设备师接到报废设备订单，经济压力和被轻视的翻盘补偿都在现场。',
      '系统面板弹出刺眼评价，隐藏工具箱贴着他的维修职业生效，把混乱设备故障量化成可升级、可验证、可反击的目标。',
      '客户当众质疑他没有资质，协会也压住订单，他却用隐藏工具箱修出第一段线路结果，拿结果反证自己。',
      '旧城设备师用隐藏工具箱把报废设备修成新订单，系统面板给出即时反馈，小胜兑现后又出现医院设备的新门槛。',
      '节奏按番茄口味推进：快节奏、强回报、清晰冲突、短周期爽点；微创新只服务维修职业，没有跑出都市系统逆袭模板。',
      '本章没有为补短板新增旁枝支线，而是拉长题材长板：中年危机翻盘、系统评价吐槽、新手奖励立刻见效三个角度都服务核心卖点和目标情绪。',
    ].join('\n')
    const driftText = [
      '这一章改成古风权谋，主角进入修仙秘境。',
      '没有系统面板，也没有维修订单。',
      '金手指突然变成血脉神通，和设备维修职业无关。',
      '本章主要展示宏大世界观，微创新很多，暂时没有现实回报。',
      '为了补感情短板，作者新增一条豪门恋爱支线，冲淡了核心卖点和题材长板。',
      '这属于挂羊头卖狗肉，但作者觉得设定更有意思。',
    ].join('\n')

    const okReport = buildGenrePositioningSyncReport(project, chapter, contextPackage, positionedText)
    const warnReport = buildGenrePositioningSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('题材定位 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['题材标签', '读者心理', '类型公式', '核心梗', '金手指贴合', '必备场景', '平台适配', '微创新边界', '长板聚焦']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('题材定位缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['核心梗', '金手指贴合', '长板聚焦', '题材定位硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('longboard_focus_rules')
    expect(warnReport.next_actions.join('；')).toMatch(/题材定位|挂羊头卖狗肉/)
    expect(warnReport.next_actions.join('；')).toContain('题材长板')
  })

  test('wires deterministic genre positioning hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicGenrePositioningChecks = [buildGenrePositioningDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicGenrePositioningChecks')
  })

  test('story state sync persists a genre_positioning_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: genrePositioningSync, reviewType: 'genre_positioning_sync'")
    expect(source).toContain('buildGenrePositioningSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.genre_positioning_sync = genrePositioningSync')
  })

  test('checks female audience contract delivery after chapter text is written', () => {
    const project = { title: '春风不误', genre: '番茄女生现言', target_audience: '女性读者' }
    const chapter = { id: 34, chapter_no: 34, title: '她自己的合同' }
    const contextPackage = {
      chapter_target: {
        female_audience_contract: {
          version: 'oh_story_female_audience_v1',
          source: 'manual',
          audience_mode: 'female_longform',
          core_principles: ['安全感优先：本章必须给女主退路、能力或同盟锚点。', '代入感优先：处境、选择和反应要能投射。', '女主主动性：关键选择必须由女主自己做决定、自己推进。', '情绪即产品：主情绪要清楚。'],
          reader_need_rules: ['女频深层需求是被认可、被珍视、被尊重。'],
          copy_promise_rules: ['状态 → 困境 → 行动 → 成功，正文必须给女主成功暗示。'],
          romance_axis_rules: ['感情升级最好踩在女主的一次事业进展或成长节点上。'],
          abuse_dosage_rules: ['每段虐后必给反转或糖，避免连续整卷只虐。'],
          platform_fit_rules: ['番茄女生安全感要早给，节奏要快，回报要清楚。'],
          quality_checks: ['货板一致：书名简介内容与正文交付一致。'],
        },
      },
    }
    const femaleFacingText = [
      '女主先被合作方质疑，但她没有等男主救场，而是自己做决定，把合同退路和备份报价摆到桌面上。',
      '她用专业能力重新拆分条款，拿到客户认可，也让对方当场尊重她的边界，安全感来自能力、退路和同盟锚点。',
      '这一段让女性读者能代入她被轻视后的反击：她被认可、被珍视、被尊重，不再只是被安排赢。',
      '状态是被压价，困境是合同被抢，行动是她亲自谈判，成功是签回自己的合同，女主成功暗示已经落地。',
      '感情线没有抢走事业线，男主只在她完成成长节点后递来一杯热茶，暧昧升级踩在事业进展上。',
      '前面受委屈后立刻给反转和一点糖，没有连续只虐；番茄女生节奏保持快回报，货板一致。',
    ].join('\n')
    const passiveText = [
      '女主一直被虐，没有退路，也没有安全感。',
      '关键选择都由男主安排，女主被安排着赢。',
      '感情线脱离成长线，男主出面解决所有事业问题。',
      '这一章连续只虐，没有反转或糖。',
      '书名简介说女主事业翻盘，正文却只写她被迫等待别人施舍。',
    ].join('\n')

    const okReport = buildFemaleAudienceSyncReport(project, chapter, contextPackage, femaleFacingText)
    const warnReport = buildFemaleAudienceSyncReport(project, chapter, contextPackage, passiveText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('女频长篇 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['核心原则', '读者深层需求', '文案承诺', '感情线双轴', '虐戏剂量', '平台适配']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('女频长篇缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['核心原则', '感情线双轴', '女频长篇硬伤']))
    expect(warnReport.next_actions.join('；')).toMatch(/安全感|女主主动/)
  })

  test('story state sync persists a female_audience_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: femaleAudienceSync, reviewType: 'female_audience_sync'")
    expect(source).toContain('buildFemaleAudienceSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.female_audience_sync = femaleAudienceSync')
  })

  test('wires deterministic female audience hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicFemaleAudienceChecks = [buildFemaleAudienceDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicFemaleAudienceChecks')
  })

  test('checks plot dynamics contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 36, chapter_no: 36, title: '红色阀门' }
    const contextPackage = {
      chapter_target: {
        plot_dynamics_contract: {
          version: 'oh_story_plot_dynamics_v1',
          source: 'manual',
          plot_loop: [
            '目标：主角必须在医院停机前找到红色阀门故障。',
            '阻碍：协会会长封锁设备间，客户授权也被临时冻结。',
            '行动：主角拆开旧控制箱，用隐藏工具箱核验阀门线路。',
            '代价/反馈：线路核验暴露主角违规进入，客户信任提高但协会追责升级。',
            '新期待：章末红色阀门编号指向协会账本。',
          ],
          climax_formula: ['蓄能', '假胜', '崩解', '交叉死磕', '悬置收尾'],
          ab_outline: ['A 蓄压：协会封门提高阻碍。', 'B 抬情绪：主角用工具箱给出小反转。'],
          scene_purpose_map: ['场景1：核验红色阀门 -> 暴露协会账本线索。'],
          drive_mode_rules: [
            '番茄爽文/打脸文使用事件驱动：每章给一个外部结果，至少赢了、升级了、对手栽了之一可见。',
            '混合模式主线用事件往前推，每 3-5 章插一段情感停顿，但情感停顿也必须保留人物心结。',
          ],
          line_stagger_rules: [
            '主线和支线错开节奏推进，没有同时爆也没有同时空转。',
            '战力提升线、装备收获线、情感线、声望线不同步推进，避免同质化。',
          ],
          quality_checks: ['目标、阻碍、行动、代价/反馈、新期待必须闭环。'],
        },
      },
    }
    const drivenText = [
      '目标很明确：主角必须在医院停机前找到红色阀门故障。',
      '阻碍随即压上来，协会会长封锁设备间，客户授权也被临时冻结。',
      '他没有等人通融，直接拆开旧控制箱，用隐藏工具箱核验阀门线路。',
      '蓄能阶段，故障倒计时压低所有人的声音；假胜时，系统先显示阀门恢复。',
      '下一秒崩解出现，备用线路反向烧红，协会会长借机追责。',
      '交叉死磕里，主角一边稳住客户，一边当场追出协会账本编号。',
      '代价/反馈落地：违规进入被记录，客户信任提高，但协会追责升级。',
      '悬置收尾没有关门，章末红色阀门编号指向协会账本，留下新期待。',
      'A 蓄压和 B 抬情绪交替出现，红色阀门场景暴露了账本线索。',
      '本章按番茄爽文事件驱动执行，给出外部结果：主角赢下设备间处置权，工具箱升级出隐藏芯片，协会会长当众栽了一回。',
      '多线错峰也可见：主线推进到设备间账本，装备收获隐藏工具箱芯片，声望线只让客户信任提高，情感线保持待推进；主线和支线错开节奏推进，没有同时爆，也没有同时空转。',
    ].join('\n')
    const flatText = [
      '本章没有明确目标。',
      '也没有真正阻碍，主角一路顺利解决。',
      '他解释了很多背景，事情自然结束。',
      '没有代价反馈，也没有新期待。',
      '高潮没有假胜、崩解和交叉死磕，事情到这里结束。',
      '它明明是番茄爽文，却只有内心独白和两个人坐着闲谈，没有赢、没有升级、没有对手栽了，也没有任何外部结果。',
      '主线、支线、情感线和声望线同时爆完，后面又一起空转。',
    ].join('\n')

    const okReport = buildPlotDynamicsSyncReport(project, chapter, contextPackage, drivenText)
    const warnReport = buildPlotDynamicsSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('剧情动力 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['剧情闭环', '高潮公式', 'A/B节奏', '场景功能', '驱动方式', '多线错峰']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('剧情动力缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['剧情闭环', '高潮公式', '驱动方式', '多线错峰', '剧情动力硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('drive_mode_rules')
    expect(warnReport.next_actions.join('；')).toMatch(/目标|阻碍|代价/)
    expect(warnReport.next_actions.join('；')).toContain('外部结果')
    expect(warnReport.next_actions.join('；')).toContain('主线和支线错开')
  })

  test('story state sync persists a plot_dynamics_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: plotDynamicsSync, reviewType: 'plot_dynamics_sync'")
    expect(source).toContain('buildPlotDynamicsSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.plot_dynamics_sync = plotDynamicsSync')
  })

  test('wires deterministic plot dynamics hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicPlotDynamicsChecks = [buildPlotDynamicsDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicPlotDynamicsChecks')
  })

  test('checks character relation contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 37, chapter_no: 37, title: '代签追责' }
    const contextPackage = {
      chapter_target: {
        character_relation_contract: {
          relationship_types: ['主角与林青禾：合作互信但仍有边界'],
          important_relationships: ['林青禾不能只是支持者，必须在追责会上主动拿出证据。'],
          independent_goals: ['主角要保住客户授权；林青禾要洗清代签责任。'],
          goal_ownership_rules: ['主角目标必须属于自己的，不能只是帮别人实现目标，否则主角会变成配角/工具人。'],
          relationship_life_rules: ['角色生命中必须有恋爱之外的内容，不能只是单薄的情感工具人。'],
          expectation_hub_rules: ['林青禾作为配角期待枢纽/任务基地，必须同时承载短期期待和长期期待；主角每次解决事件装完逼后回到她这里开启新一轮装逼，新剧情单元结束也由她递出下一轮新任务；她下线时要带来更大好处，转化损失厌恶。'],
          tests_or_pressure: ['协会追责、代签背锅、客户撤授权形成关系压力测试。'],
          attitude_shifts: ['林青禾从旁观/质疑转为主动作证并愿意协助。'],
          quality_checks: ['关系类型、独立目标、压力测试、态度变化和阶段匹配必须落进正文。'],
        },
      },
    }
    const relationText = [
      '关系类型：合作互信但仍有边界，林青禾没有立刻站到主角身后。',
      '主角的独立目标是保住客户授权，林青禾的独立目标是洗清代签责任。',
      '主角目标属于自己的：他不是帮林青禾完成调查，而是为了自己的客户授权、维修铺和后续接单资格主动追责。',
      '林青禾除了关系线里的信任变化，还有洗清代签责任、守住家族账册和承担作证后果这些恋爱之外的内容。',
      '林青禾作为配角期待枢纽和任务基地，同时承载短期期待：追责会作证，长期期待：后续账册线索。',
      '主角解决代签追责并完成装逼后回到林青禾这里，林青禾递出新账册线索，开启下一轮新任务和新一轮装逼。',
      '如果她暂时下线，也带来更大好处：家族账册钥匙和新客户授权，让读者从损失厌恶转为歪打误撞收获更多。',
      '协会追责、代签背锅和客户撤授权一起压下来，逼两人接受关系压力测试。',
      '林青禾不再只是支持者，她在追责会上主动拿出证据，替自己也替主角作证。',
      '她从旁观/质疑转为主动作证并愿意协助，但仍保留边界，没有直接越过当前亲密阶段。',
    ].join('\n')
    const flatText = [
      '两人只是互相支持。',
      '关系没有变化。',
      '配角只围着主角转，没有自己的目标。',
      '主角整章只是帮林青禾洗清代签责任，没有自己的客户授权诉求。',
      '她只负责恋爱和情绪支持，是单薄的情感工具人。',
      '林青禾只在旁边夸主角厉害，没有短期期待，也没有长期期待。',
      '主角解决事件后没有回到她这里开启新任务。',
      '她下线没有带来更大好处，只是消失。',
      '男主替主角解决全部问题。',
    ].join('\n')

    const okReport = buildCharacterRelationSyncReport(project, chapter, contextPackage, relationText)
    const warnReport = buildCharacterRelationSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('角色关系 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['关系类型', '独立目标', '目标归属', '角色不止恋爱', '配角期待枢纽', '关系压力', '态度变化']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('角色关系缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['关系弧线', '独立目标', '目标归属', '角色不止恋爱', '配角期待枢纽', '配角攻略缓冲区', '角色关系硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goal_ownership_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('relationship_life_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('expectation_hub_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('buffer_zone_rules')
    expect(warnReport.priority_repair).toContain('配角攻略缓冲区')
    expect(warnReport.next_actions.join('；')).toMatch(/关系类型|独立目标|压力/)
    expect(warnReport.next_actions.join('；')).toMatch(/任务基地|新一轮期待/)
    expect(warnReport.next_actions.join('；')).toContain('主角自己的目标')
  })

  test('checks character relation buffer-zone progression after delivery', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 42, chapter_no: 42, title: '半页账册' }
    const contextPackage = {
      chapter_target: {
        character_relation_contract: {
          relationship_types: ['主角与林青禾：联盟型，合作互信但仍有边界。'],
          buffer_zone_rules: [
            '配角攻略缓冲区必须始终存在：信息差、地位差距、亲密度差距或信任程度至少保留一种。',
            '关键拐点必须写清配角从旁观/质疑/拒绝/试探到行动/协助/设限的态度变化。',
            '配角不能像 NPC 一样站着等主角触发，必须有自己的行动和动机。',
          ],
          attitude_shifts: ['林青禾从旁观/质疑转为主动协助，但仍设下账册来源边界。'],
          quality_checks: ['缓冲区、配角主动行动和态度变化必须有正文证据。'],
        },
      },
    }
    const progressedText = [
      '两人的关系类型是联盟型，合作互信但仍有边界。',
      '配角攻略缓冲区仍在：林青禾只交出半页账册，保留钥匙来源这个信息差；她信任沈砚查账，却还没有共享家族账册全貌。',
      '关键拐点写清态度变化：她从旁观/质疑转为主动协助并设限，同时为了洗清自己的代签责任行动。',
      '林青禾不是 NPC 式站桩等待触发，她先联系账房、拿到证词，再设下“只查半页、不碰家族钥匙”的边界。',
    ].join('\n')
    const flatText = [
      '林青禾站在旁边等主角问话。',
      '她完全信任主角，把所有信息一次性交出来。',
      '两人关系很好，没有信息差、没有地位差距、没有信任程度变化。',
      '她没有自己的行动和动机，也没有从旁观质疑到协助设限的态度变化。',
    ].join('\n')

    const okReport = buildCharacterRelationSyncReport(project, chapter, contextPackage, progressedText)
    const warnReport = buildCharacterRelationSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.delivered.map((item: any) => item.key)).toContain('buffer_zone_rules')
    expect(okReport.delivered.find((item: any) => item.key === 'buffer_zone_rules')?.evidence.join('｜')).toContain('信息差')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.find((item: any) => item.key === 'buffer_zone_rules')?.label).toBe('配角攻略缓冲区')
    expect(warnReport.missed.find((item: any) => item.key === 'buffer_zone_rules')?.missed_items).toEqual(expect.arrayContaining([
      '缺信息差/地位差距/亲密度差距/信任程度缓冲区',
      '配角像 NPC 一样站桩等待触发',
      '缺旁观/质疑/拒绝/试探到行动/协助/设限的态度变化',
    ]))
    expect(warnReport.priority_repair).toBe('优先补配角攻略缓冲区')
    expect(warnReport.next_actions.join('；')).toContain('配角攻略缓冲区')
  })

  test('story state sync persists a character_relation_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterRelationSync, reviewType: 'character_relation_sync'")
    expect(source).toContain('buildCharacterRelationSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.character_relation_sync = characterRelationSync')
  })

  test('wires deterministic character relation hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCharacterRelationChecks = [buildCharacterRelationDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicCharacterRelationChecks')
  })

  test('checks character desire, flaw pressure and growth beat after delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 13, chapter_no: 13, title: '裂纹代价' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        character_arc_brief: {
          character_name: '沈砚',
          desire: '沈砚想保住试炼资格并证明阵图属于自己',
          flaw_pressure: '他害怕暴露阵盘裂纹，只想继续藏拙',
          relationship_shift: '林青禾从旁观转为愿意替他作证',
          growth_beat: '沈砚第一次主动承认残阵缺陷，把藏拙改成公开争取',
          voice_anchor: '克制、冷静，但遇到阵法归属会寸步不让',
        },
        scene_cards: [
          {
            title: '裂纹作证',
            character_goal: '沈砚保住试炼资格并证明阵图属于自己',
            flaw_pressure: '害怕暴露阵盘裂纹',
            relationship_shift: '林青禾愿意替他作证',
            growth_beat: '主动承认残阵缺陷',
          },
        ],
      },
    }
    const grownText = [
      '沈砚想保住试炼资格，也要证明阵图属于自己。',
      '他原本害怕暴露阵盘裂纹，只想继续藏拙。',
      '可这一次，他没有再退，主动承认残阵缺陷，把藏拙改成公开争取。',
      '林青禾看见他把裂纹摆上台面，终于从旁观转为愿意替他作证。',
      '他的语气仍然克制冷静，可谈到阵法归属时寸步不让。',
    ].join('\n')
    const flatText = '沈砚在阵堂听别人争执。林青禾站在人群里没有表态。众人讨论许久，试炼资格暂时搁置。'

    const okReport = buildCharacterArcSyncReport(project, chapter, contextPackage, grownText)
    const warnReport = buildCharacterArcSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('人物弧光 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('人物弧光缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('角色欲望')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('缺陷受压')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('成长节点')
    expect(warnReport.next_actions.join('；')).toContain('人物成长')
  })

  test('reads raw camelCase character arc brief after delivery', () => {
    const report = buildCharacterArcSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 26,
        chapter_no: 26,
        title: '旧广播室',
        raw_payload: {
          preDraftBrief: {
            characterArcBrief: {
              desire: '李超想证明自己不只能靠蛮力破局。',
              flawPressure: '他害怕一收住蛮力就会拖累张智。',
              relationshipShift: '李超第一次主动把判断权交给张智。',
              growthBeat: '李超从硬闯转为主动配合规则实验。',
              voiceAnchor: '李超嘴硬但行动开始克制。',
            },
          },
        },
      },
      {},
      '李超想证明自己不只能靠蛮力破局。门锁反噬时，他害怕一收住蛮力就会拖累张智，可这一次他没有硬闯，而是第一次主动把判断权交给张智。李超从硬闯转为主动配合规则实验，嘴上仍说别磨蹭，行动却开始克制。',
    )

    expect(report.label).not.toBe('人物弧光未配置')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['角色欲望', '缺陷受压', '关系变化', '成长节点', '口吻锚点']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a character_arc_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterArcSync, reviewType: 'character_arc_sync'")
    expect(source).toContain('buildCharacterArcSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.character_arc_sync = characterArcSync')
  })

  test('supports a manually edited chapter word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })

    expect(target.mode).toBe('custom')
    expect(target.target).toBe(5200)
    expect(target.min).toBe(4680)
    expect(target.max).toBe(5720)
    expect(target.rangeText).toBe('4680-5720 字')
  })

  test('builds a commercial editor rewrite prompt with concrete improvement dimensions', () => {
    const prompt = buildCommercialEditorRewritePrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          ending_hook: '午夜广播公布第一条规则。',
          word_target: resolveChapterWordTarget({}, { chapter_no: 1 }, {}),
          scene_cards: [
            {
              scene_no: 1,
              title: '操场醒来',
              opening_hook: '车祸后的第一口冷风。',
              reader_payoff: '超人力量与规则压制第一次碰撞。',
              fear_point: '尾音被黑暗吞掉。',
              rule_pressure: '十点后不得离开宿舍。',
              ending_hook_seed: '钟表停在九点五十八分。',
            },
          ],
        },
      },
      '初稿正文',
    )

    expect(prompt).toContain('商业主编改稿')
    expect(prompt).toContain('开篇钩子')
    expect(prompt).toContain('人物声音')
    expect(prompt).toContain('规则压力')
    expect(prompt).toContain('恐怖具象化')
    expect(prompt).toContain('爽点密度')
    expect(prompt).toContain('章末钩子')
    expect(prompt).toContain('删除模板句')
    expect(prompt).toContain('prose_chapters')
    expect(prompt).toContain('scene_start_anchor')
    expect(prompt).toContain('scene_end_anchor')
    expect(prompt).toContain('scene_card_receipts')
  })

  test('asks commercial editor rewrite to preserve facts while applying oh-story natural prose rules', () => {
    const prompt = buildCommercialEditorRewritePrompt(
      { title: '审判庭旧账' },
      {
        chapter_target: {
          chapter_no: 3,
          title: '第二枚封条',
          word_target: resolveChapterWordTarget({}, { chapter_no: 3 }, {}),
        },
        setting_context: {
          forbidden: ['不能提前公开第三枚封条'],
        },
      },
      '初稿正文',
    )

    expect(prompt).toContain('oh-story 自然改稿底线')
    expect(prompt).toContain('动作 -> 对话 -> 情绪反应')
    expect(prompt).toContain('对话要像人说话')
    expect(prompt).toContain('心情不写心里话')
    expect(prompt).toContain('章尾不搞大升华')
    expect(prompt).toContain('打斗不写流水账')
    expect(prompt).toContain('修订守恒')
    expect(prompt).toContain('不得改写主线事实')
    expect(prompt).toContain('不得新增支线、设定、关系或时间线')
  })

  test('uses compact context snapshots for commercial editor prompts without leaking circular context', () => {
    const contextPackage: any = {
      chapter_target: {
        chapter_no: 2,
        title: '循环改稿',
        word_target: resolveChapterWordTarget({}, { chapter_no: 2 }, {}),
        scene_cards: [
          {
            title: '门锁回响',
            goal: `逼主角立刻处理上一章钩子；${'模型自检：scene_cards.goal_obstacle_change_delivered=false；'.repeat(20)}`,
          },
        ],
      },
    }
    contextPackage.self = contextPackage

    const prompt = buildCommercialEditorRewritePrompt(
      { title: '循环测试' },
      contextPackage,
      '初稿正文',
    )

    expect(prompt).toContain('循环改稿')
    expect(prompt).toContain('门锁回响')
    expect(prompt).toContain('逼主角立刻处理上一章钩子')
    expect(prompt).not.toContain('[Circular]')
    expect(prompt).not.toContain('goal_obstacle_change_delivered=false')
  })

  test('uses safe json for prose quality review payloads that include context packages', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).not.toContain('payload: JSON.stringify({ chapter_id: chapter.id, context_package')
    expect(source).not.toContain('payload: JSON.stringify({\n          chapter_id: chapter.id,\n          context_package: finalReviewContextPackage')
    expect(source).not.toContain('JSON.stringify(chapter.raw_payload || {})')
  })

  test('reads runtime camelCase chapterTarget word target when building editor rewrite prompts', () => {
    const runtimeTarget = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })
    const prompt = buildCommercialEditorRewritePrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧标题',
        },
        chapterTarget: {
          chapterNo: 8,
          title: '会长私印',
          wordTarget: runtimeTarget,
        },
      },
      '初稿正文',
    )

    expect(prompt).toContain('目标章节：第8章《会长私印》')
    expect(prompt).toContain('字数约束：目标 5200 字，可接受范围 4680-5720 字')
  })
})
