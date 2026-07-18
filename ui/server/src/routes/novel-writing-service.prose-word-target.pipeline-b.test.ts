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

describe('prose word target pipeline b', () => {
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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

})
