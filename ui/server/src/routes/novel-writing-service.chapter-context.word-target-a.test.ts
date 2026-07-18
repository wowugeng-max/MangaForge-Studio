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

describe('chapter context word-target a', () => {
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
    const routeSource = [
      readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-generation/register.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-generation/builders.ts'), 'utf8'),
    ].join('\n')
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


})
