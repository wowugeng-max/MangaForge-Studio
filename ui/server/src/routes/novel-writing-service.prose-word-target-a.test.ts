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

describe('prose word target a', () => {
  test('counts prose characters without whitespace for chapter target evaluation', () => {
    expect(countProseChars('李辰 醒来\n规则响起。')).toBe(9)
  })

  test('rejects a standard chapter draft below the minimum word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)

    expect(evaluation.passed).toBe(false)
    expect(evaluation.too_short).toBe(true)
    expect(evaluation.actual).toBe(1732)
    expect(evaluation.deficit).toBe(target.min - evaluation.actual)
    expect(evaluation.min).toBe(target.min)
    expect(evaluateProseWordTarget('字'.repeat(target.min), target).passed).toBe(true)
  })

  test('rejects a standard chapter draft above the maximum word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(12389), target)

    expect(evaluation.passed).toBe(false)
    expect(evaluation.too_long).toBe(true)
    expect(evaluation.actual).toBe(12389)
    expect(evaluation.max).toBe(target.max)
  })

  test('contracts over-target prose before returning the best complete candidate with a warning', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-word-target-methods.ts'), 'utf8')
    const ensureStart = source.indexOf('const ensureProseMeetsWordTarget =')
    const ensureEnd = source.indexOf('return {\n    ensureProseMeetsWordTarget,', ensureStart)
    const ensureBlock = source.slice(ensureStart, ensureEnd)
    const tooLongStart = ensureBlock.indexOf('if (evaluation.too_long && options.contract !== false)')
    const contractionStart = ensureBlock.indexOf('const maxContractionAttempts', tooLongStart)
    const expansionStart = ensureBlock.indexOf('const maxExpansionAttempts')
    const contractionBlock = ensureBlock.slice(contractionStart, expansionStart)
    const softCapStart = ensureBlock.indexOf('let evaluation = applyProseWordTargetSoftCap(hardEvaluation)')

    expect(ensureStart).toBeGreaterThanOrEqual(0)
    expect(ensureEnd).toBeGreaterThan(ensureStart)
    expect(ensureBlock.match(/applyProseWordTargetSoftCap\(evaluateProseWordTarget/g)).toHaveLength(5)
    expect(softCapStart).toBeGreaterThanOrEqual(0)
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
    expect(prompt).toContain(`目标 ${target.target} 字`)
    expect(prompt).toContain(`至少 ${target.min} 字`)
    expect(prompt).toContain('不得删改已有效内容')
    expect(prompt).toContain('先按场景/情节点预算补当前章必须交付点，再补动作过程、选择代价、对话交锋、章末钩子铺垫')
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
    expect(prompt).toContain(`仍缺至少 ${evaluation.deficit} 字`)
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

  test('recovers the full closed chapter text when an unescaped ascii quote appears after 200 characters', () => {
    const prefix = '分析局的冷白灯照着每个人，所有人都在等待第三次直播。'.repeat(18)
    const suffix = '走廊尽头的灯管开始闪烁，江哲仍然没有停下脚步。'.repeat(18)
    const chapterText = `${prefix}"第三位天选者，今晚就会被选中。"${suffix}`
    const payload = getNovelPayload({
      content: `\`\`\`json\n{"chapter_text":"${chapterText}","continuity_notes":[]}\n\`\`\``,
      finish_reason: 'end_turn',
    })

    expect(prefix.replace(/\s/g, '').length).toBeGreaterThan(200)
    expect(payload.chapter_text).toBe(chapterText)
    expect(payload.prose_chapters?.[0]?.chapter_text).toBe(chapterText)
    expect(payload.recovered_from_partial_json).toBe(true)
    expect(payload.partial_json_open_string_recovered).toBe(false)
  })


  test('defaults normal chapters to roughly 4200 Chinese characters', () => {
    const target = resolveChapterWordTarget({ length_target: 'epic' }, { chapter_no: 1 }, {})

    expect(target.mode).toBe('standard')
    expect(target.target).toBe(4200)
    expect(target.min).toBe(3780)
    expect(target.max).toBe(4620)
    expect(target.rangeText).toBe('3780-4620 字')
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
    expect(prompt).toContain('全章硬目标：10000 字')
    expect(prompt).toContain('落点范围 9000-11000 字')
    expect(prompt).toContain('场景字数分配：')
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

})
