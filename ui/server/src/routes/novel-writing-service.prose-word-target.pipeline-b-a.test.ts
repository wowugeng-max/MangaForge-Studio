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

describe('prose word target pipeline b a', () => {
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

})
