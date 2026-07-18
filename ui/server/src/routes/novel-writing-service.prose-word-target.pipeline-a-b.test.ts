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

describe('prose word target pipeline a b', () => {
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


})
