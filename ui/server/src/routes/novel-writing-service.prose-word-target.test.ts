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

describe('prose word target', () => {
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-word-target-methods.ts'), 'utf8')
    const ensureStart = source.indexOf('const ensureProseMeetsWordTarget =')
    const ensureEnd = source.indexOf('return {\n    ensureProseMeetsWordTarget,', ensureStart)
    const ensureBlock = source.slice(ensureStart, ensureEnd > ensureStart ? ensureEnd : source.length)
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

})
