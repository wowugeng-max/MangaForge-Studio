import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessStatus,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueItemStatus,
  WritingQueueItem,
  WritingQueueModel,
  ChapterPlanningReadiness,
  ChapterContextPackageStatus,
  ChapterScenePlanStatus,
  ChapterPlanningDeskSceneCard,
  ChapterQualityContinuitySceneMapItem,
  ChapterWritePreparationBrief,
  ChapterPlanningDeskModel,
  ChapterAcceptanceStatus,
  DeslopGateDiagnosticsModel,
  ChapterAcceptanceDeskModel,
  ChapterHandoffStatus,
  ChapterHandoffDeskModel,
  LongformWorkflowStageKey,
  LongformWorkflowStageStatus,
  LongformWorkflowStageModel,
  LongformWorkflowModel,
  WritingCockpitModel,
  BuildWritingCockpitModelInput,
} from './types'
import { parseWorkspacePayload } from '../../payloadParseCache'


import {
  ACTION_LABELS,
  QUALITY_PASS_THRESHOLD,
  arrayValue,
  buildApprovalBlockerSummary,
  buildBlueprintReceiptSummary,
  buildDeliveryRiskReceiptSummary,
  buildDeslopGateDiagnosticsSummary,
  buildPlatformRubricSummary,
  buildQualityAuditSummary,
  buildRevisionReceiptSummary,
  buildSceneCardReceiptSummary,
  compareReviewRefs,
  countArray,
  createdTime,
  deliveryReceiptsFrom,
  firstNonEmpty,
  hasProse,
  issueText,
  latestReviewRef,
  parsedTime,
  proseQualityReviewMatchesCurrentChapter,
  qualityPayload,
  reportPayload,
  reviewPayload,
  reviewType,
  revisionPayload,
  storylineSyncPayload,
  stringArray,
  text,
  uniqueObjects,
  uniqueStrings,
} from './cockpit-basics'
import {
  buildAssetIntakeSummary,
  buildBenchmarkRecallSyncSummary,
  buildChapterAttractionSummary,
  buildChapterBenchmarkSyncSummary,
  buildChapterHandoffSyncSummary,
  buildCharacterArcSyncSummary,
  buildCoreDriftSummary,
  buildDeliveryRiskQueue,
  buildFirst30RetentionRecheckSummary,
  buildInnovationSyncSummary,
  buildIntentConfirmationSyncSummary,
  buildIpSceneIntakeSummary,
  buildPreDraftExecutionSyncSummary,
  buildQualityAuditRepairReceiptSyncSummary,
  buildQualityAuditSyncSummary,
  buildQualityCheckSummary,
  buildReadabilityReviewSummary,
  buildReaderExpectationSyncSummary,
  buildReaderPayoffSyncSummary,
  buildReaderRetentionSyncSummary,
  buildRunwaySyncSummary,
  buildSceneCardDirectiveSummary,
  buildSignatureSceneSyncSummary,
  buildStoryDriveSyncSummary,
  buildStoryUnitSyncSummary,
  buildStorylineSyncSummary,
  buildStyleSampleSyncSummary,
  buildVolumeBeatSyncSummary,
  mergeContractSyncSummary,
} from './cockpit-acceptance'

import {
  buildDeliveryRiskConvergenceSummary,
  buildGovernanceRecheckSyncSummary,
  extractQualityScore,
  resolveProseAdmission,
  normalizedAdmissionWarnings,
  normalizedPostCommitWarnings,
  hasUsableProseQualityReview,
  extractMustFix,
  extractOptionalImprovements,
  reportBelongsToCurrentQualityCycle,
  storyStateFailureMessages
} from './cockpit-acceptance-desk-utils'

import { buildStoryStatePanel } from './cockpit-acceptance-desk-story-state'
import { buildHiddenAcceptanceDesk } from './cockpit-acceptance-desk-hidden'

export function buildChapterAcceptanceDesk(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  reviews: AnyRecord[]
  activeRuns: AnyRecord[]
  storyState: AnyRecord
}): ChapterAcceptanceDeskModel {
  if (!args.nextChapter) return buildHiddenAcceptanceDesk()

  const latestQualityReviewRef = latestReviewRef(args.reviews, args.nextChapter, 'prose_quality')
  const latestQualityRef = latestQualityReviewRef
    && proseQualityReviewMatchesCurrentChapter(latestQualityReviewRef.review, args.nextChapter)
    && hasUsableProseQualityReview(latestQualityReviewRef.review)
    ? latestQualityReviewRef
    : null
  const latestReportRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_report')
  const latestRevisionRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_revision')
  const latestStorylineSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'storyline_sync')
  const latestStoryUnitSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'story_unit_sync')
  const latestAssetIntakeRef = latestReviewRef(args.reviews, args.nextChapter, 'asset_intake')
  const latestAssetLinkageSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'asset_linkage_sync')
  const latestIpSceneIntakeRef = latestReviewRef(args.reviews, args.nextChapter, 'ip_scene_intake')
  const latestSignatureSceneSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'signature_scene_sync')
  const latestReadabilityRef = latestReviewRef(args.reviews, args.nextChapter, 'readability_review')
  const latestCoreDriftRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_core_drift')
  const latestRunwaySyncRef = latestReviewRef(args.reviews, args.nextChapter, 'runway_sync')
  const latestReaderPayoffSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_payoff_sync')
  const latestReaderExpectationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_expectation_sync')
  const latestQualityAuditSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'quality_audit_sync')
  const latestQualityAuditRepairReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'quality_audit_repair_receipt_sync')
  const latestChapterHandoffSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_handoff_sync')
  const latestChapterHandoffDeltaSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_handoff_delta_sync')
  const latestIntentConfirmationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'intent_confirmation_sync')
  const latestBenchmarkRecallSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'benchmark_recall_sync')
  const latestReaderRetentionSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_retention_sync')
  const latestChapterAttractionRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_attraction_review')
  const latestStoryDriveSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'story_drive_sync')
  const latestCharacterArcSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'character_arc_sync')
  const latestChapterBenchmarkSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_benchmark_sync')
  const latestStyleSampleSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'style_sample_sync')
  const latestInnovationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'innovation_sync')
  const latestVolumeBeatSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'volume_beat_sync')
  const latestGovernanceRecheckSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'governance_recheck_sync')
  const latestDeliveryRiskConvergenceRef = latestReviewRef(args.reviews, args.nextChapter, 'delivery_risk_convergence')
  const latestDeslopRepairReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'deslop_repair_receipt_sync')
  const latestProseRevisionReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'prose_revision_receipt_sync')
  const latestQuality = latestQualityRef?.review || null
  const latestReport = latestReportRef?.review || null
  const latestRevision = latestRevisionRef?.review || null
  const latestQualityPayload = reviewPayload(latestQuality)
  const proseAdmission = resolveProseAdmission(args.nextChapter, latestQualityPayload, args.activeRuns)
  const admissionStatus = firstNonEmpty(proseAdmission?.status, proseAdmission?.admission_status, proseAdmission?.admissionStatus) as ChapterAcceptanceDeskModel['admissionStatus']
  const qualityWarnings = normalizedAdmissionWarnings(proseAdmission?.quality_warnings || proseAdmission?.qualityWarnings)
  const storyStateStatus = firstNonEmpty(proseAdmission?.story_state_status, proseAdmission?.storyStateStatus) as ChapterAcceptanceDeskModel['storyStateStatus']
  const postCommitWarnings = normalizedPostCommitWarnings(proseAdmission?.post_commit_warnings || proseAdmission?.postCommitWarnings)
  const storyStatePanel = buildStoryStatePanel({
    chapter: args.nextChapter,
    storyState: args.storyState,
    proseAdmission,
    hasChapterProse: hasProse(args.nextChapter),
  })
  const admissionFields = { admissionStatus, qualityWarnings, storyStateStatus, storyStatePanel, postCommitWarnings }
  if (!hasProse(args.nextChapter) && admissionStatus !== 'blocked_invalid') return buildHiddenAcceptanceDesk()
  const storylineSync = buildStorylineSyncSummary(latestStorylineSyncRef?.review || null)
  const storyUnitSync = buildStoryUnitSyncSummary(latestStoryUnitSyncRef?.review || null)
  const assetIntake = buildAssetIntakeSummary(latestAssetIntakeRef?.review || null)
  const ipSceneIntake = buildIpSceneIntakeSummary(latestIpSceneIntakeRef?.review || null)
  const signatureSceneSync = buildSignatureSceneSyncSummary(latestSignatureSceneSyncRef?.review || null)
  const readabilityReview = buildReadabilityReviewSummary(latestReadabilityRef?.review || null)
  const coreDrift = buildCoreDriftSummary(latestCoreDriftRef?.review || null)
  const runwaySync = buildRunwaySyncSummary(latestRunwaySyncRef?.review || null)
  const readerPayoffSync = buildReaderPayoffSyncSummary(latestReaderPayoffSyncRef?.review || null)
  const readerExpectationSync = buildReaderExpectationSyncSummary(latestReaderExpectationSyncRef?.review || null)
  const qualityAuditSync = buildQualityAuditSyncSummary(latestQualityAuditSyncRef?.review || null)
  const qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncSummary(latestQualityAuditRepairReceiptSyncRef?.review || null)
  const chapterHandoffSync = mergeContractSyncSummary(
    buildChapterHandoffSyncSummary(
      latestChapterHandoffSyncRef?.review || null,
      'chapter_handoff_sync',
      'chapterHandoffSync',
      '章首承接 OK',
      '章首承接缺口',
    ),
    buildQualityCheckSummary(latestQualityPayload, 'chapter_handoff_checks', 'chapterHandoffChecks', '章首承接'),
    '章首承接',
  )
  const chapterHandoffDeltaSync = buildChapterHandoffSyncSummary(
    latestChapterHandoffDeltaSyncRef?.review || null,
    'chapter_handoff_delta_sync',
    'chapterHandoffDeltaSync',
    '章末交接 OK',
    '章末交接缺口',
  )
  const writePreparation = mergeContractSyncSummary(
    buildQualityCheckSummary(latestQualityPayload, 'write_preparation_checks', 'writePreparationChecks', '写前准备'),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'write_preparation_checks', 'writePreparationChecks', '写前准备'),
    '写前准备',
  )
  const intentConfirmationSync = mergeContractSyncSummary(
    buildIntentConfirmationSyncSummary(latestIntentConfirmationSyncRef?.review || null),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'intent_confirmation_checks', 'intentConfirmationChecks', '意图确认'),
    '意图确认',
  )
  const benchmarkRecallSync = mergeContractSyncSummary(
    buildBenchmarkRecallSyncSummary(latestBenchmarkRecallSyncRef?.review || null),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'benchmark_recall_checks', 'benchmarkRecallChecks', '文风召回'),
    '文风召回',
  )
  const sourceReadiness = buildQualityCheckSummary(latestQualityPayload, 'source_readiness_checks', 'sourceReadinessChecks', '来源就绪')
  const stateTracking = buildQualityCheckSummary(latestQualityPayload, 'state_tracking_checks', 'stateTrackingChecks', '状态跟踪')
  const styleBoundary = buildQualityCheckSummary(latestQualityPayload, 'style_boundary_checks', 'styleBoundaryChecks', '风格边界')
  const informationFlow = buildQualityCheckSummary(latestQualityPayload, 'information_flow_checks', 'informationFlowChecks', '信息流')
  const expectationThreshold = buildQualityCheckSummary(latestQualityPayload, 'expectation_threshold_checks', 'expectationThresholdChecks', '期待阈值')
  const storyLoop = buildQualityCheckSummary(latestQualityPayload, 'story_loop_checks', 'storyLoopChecks', '故事闭环')
  const emotionalArc = buildQualityCheckSummary(latestQualityPayload, 'emotional_arc_checks', 'emotionalArcChecks', '情绪弧')
  const chapterHook = buildQualityCheckSummary(latestQualityPayload, 'chapter_hook_checks', 'chapterHookChecks', '章级钩子')
  const paragraphHook = buildQualityCheckSummary(latestQualityPayload, 'paragraph_hook_checks', 'paragraphHookChecks', '段落级钩子')
  const suspense = buildQualityCheckSummary(latestQualityPayload, 'suspense_checks', 'suspenseChecks', '悬念编排')
  const assetLinkage = mergeContractSyncSummary(
    buildChapterHandoffSyncSummary(
      latestAssetLinkageSyncRef?.review || null,
      'asset_linkage_sync',
      'assetLinkageSync',
      '资产挂钩 OK',
      '资产挂钩缺口',
    ),
    buildQualityCheckSummary(latestQualityPayload, 'asset_linkage_checks', 'assetLinkageChecks', '资产挂钩'),
    '资产挂钩',
  )
  const dialogue = buildQualityCheckSummary(latestQualityPayload, 'dialogue_checks', 'dialogueChecks', '对白质量')
  const plotDynamics = buildQualityCheckSummary(latestQualityPayload, 'plot_dynamics_checks', 'plotDynamicsChecks', '剧情动力')
  const characterRelation = buildQualityCheckSummary(latestQualityPayload, 'character_relation_checks', 'characterRelationChecks', '角色关系')
  const characterBehavior = buildQualityCheckSummary(latestQualityPayload, 'character_behavior_checks', 'characterBehaviorChecks', '角色行为')
  const conflictStructure = buildQualityCheckSummary(latestQualityPayload, 'conflict_structure_checks', 'conflictStructureChecks', '冲突结构')
  const bridgeUnit = buildQualityCheckSummary(latestQualityPayload, 'bridge_unit_checks', 'bridgeUnitChecks', '桥段节奏')
  const reversal = buildQualityCheckSummary(latestQualityPayload, 'reversal_checks', 'reversalChecks', '反转设计')
  const showdown = buildQualityCheckSummary(latestQualityPayload, 'showdown_checks', 'showdownChecks', '高潮对抗')
  const opening = buildQualityCheckSummary(latestQualityPayload, 'opening_checks', 'openingChecks', '开篇设计')
  const proseCraft = buildQualityCheckSummary(latestQualityPayload, 'prose_craft_checks', 'proseCraftChecks', '正文工艺')
  const sceneCardDirective = buildSceneCardDirectiveSummary(latestQualityPayload)
  const punctuationTone = buildQualityCheckSummary(latestQualityPayload, 'punctuation_tone_checks', 'punctuationToneChecks', '语气标点')
  const contentRubric = buildQualityCheckSummary(latestQualityPayload, 'content_rubric_checks', 'contentRubricChecks', '内容基准')
  const targetReader = buildQualityCheckSummary(latestQualityPayload, 'target_reader_checks', 'targetReaderChecks', '目标读者')
  const genrePositioning = buildQualityCheckSummary(latestQualityPayload, 'genre_positioning_checks', 'genrePositioningChecks', '题材定位')
  const femaleAudience = buildQualityCheckSummary(latestQualityPayload, 'female_audience_checks', 'femaleAudienceChecks', '女频长篇')
  const upgradeRhythm = buildQualityCheckSummary(latestQualityPayload, 'upgrade_rhythm_checks', 'upgradeRhythmChecks', '升级节奏')
  const chapterStructure = buildQualityCheckSummary(latestQualityPayload, 'structure_checks', 'structureChecks', '章节结构')
  const chapterProgression = buildQualityCheckSummary(latestQualityPayload, 'progression_checks', 'progressionChecks', '章节推进')
  const informationLoad = buildQualityCheckSummary(latestQualityPayload, 'information_checks', 'informationChecks', '信息负载')
  const longformContinuity = buildQualityCheckSummary(latestQualityPayload, 'longform_checks', 'longformChecks', '长篇连续性')
  const coreContractCheck = buildQualityCheckSummary(latestQualityPayload, 'core_contract_checks', 'coreContractChecks', '核心契约')
  const continuityHeat = buildQualityCheckSummary(latestQualityPayload, 'continuity_heat_checks', 'continuityHeatChecks', '连续性热度')
  const revisionReceiptCheck = buildQualityCheckSummary(latestQualityPayload, 'revision_receipt_checks', 'revisionReceiptChecks', '修订回执')
  const deslopRepairCheck = buildQualityCheckSummary(latestQualityPayload, 'deslop_repair_checks', 'deslopRepairChecks', '去AI味修复')
  const proseMeta = buildQualityCheckSummary(latestQualityPayload, 'prose_meta_checks', 'proseMetaChecks', '正文元叙事')
  const serialRiskRepair = buildQualityCheckSummary(latestQualityPayload, 'serial_risk_repair_checks', 'serialRiskRepairChecks', '连续风险修复')
  const chapterHookQuality = buildQualityCheckSummary(latestQualityPayload, 'chapter_hook_quality_checks', 'chapterHookQualityChecks', '章钩质量')
  const readerRetentionCheck = buildQualityCheckSummary(latestQualityPayload, 'reader_retention_checks', 'readerRetentionChecks', '追读雷达')
  const readerRetentionSync = buildReaderRetentionSyncSummary(latestReaderRetentionSyncRef?.review || null)
  const chapterAttraction = buildChapterAttractionSummary(latestChapterAttractionRef?.review || null)
  const storyDriveSync = buildStoryDriveSyncSummary(latestStoryDriveSyncRef?.review || null)
  const characterArcSync = buildCharacterArcSyncSummary(latestCharacterArcSyncRef?.review || null)
  const chapterBenchmarkSync = buildChapterBenchmarkSyncSummary(latestChapterBenchmarkSyncRef?.review || null)
  const styleSampleSync = buildStyleSampleSyncSummary(latestStyleSampleSyncRef?.review || null)
  const first30RetentionRecheck = buildFirst30RetentionRecheckSummary(args.nextChapter, args.reviews)
  const innovationSync = buildInnovationSyncSummary(latestInnovationSyncRef?.review || null)
  const volumeBeatSync = buildVolumeBeatSyncSummary(latestVolumeBeatSyncRef?.review || null)
  const blueprintReceipt = buildBlueprintReceiptSummary(args.nextChapter)
  const revisionReceipt = buildRevisionReceiptSummary(
    reviewPayload(latestQuality),
    {
      ...reviewPayload(latestDeslopRepairReceiptSyncRef?.review || null),
      ...reviewPayload(latestProseRevisionReceiptSyncRef?.review || null),
    },
  )
  const deliveryRiskReceipt = buildDeliveryRiskReceiptSummary(reviewPayload(latestQuality))
  const sceneCardReceipt = buildSceneCardReceiptSummary(reviewPayload(latestQuality))
  const qualityAudit = buildQualityAuditSummary(reviewPayload(latestQuality))
  const platformRubric = buildPlatformRubricSummary(reviewPayload(latestQuality))
  const governanceRecheckSync = buildGovernanceRecheckSyncSummary(latestGovernanceRecheckSyncRef?.review || null)
  const deliveryRiskConvergence = buildDeliveryRiskConvergenceSummary(latestDeliveryRiskConvergenceRef?.review || null)
  const quality = qualityPayload(latestQuality)
  const legacyApprovalBlocker = buildApprovalBlockerSummary(reviewPayload(latestQuality))
  const admissionApprovalBlocker: ChapterAcceptanceDeskModel['approvalBlocker'] = admissionStatus === 'blocked_invalid'
    ? {
        type: 'blocked_invalid',
        status: 'warn',
        label: '正文无效，未入库',
        detail: qualityWarnings.map(item => item.message).join('；') || '正文未通过有效性检查且未入库。',
        scoreLabel: '终止入库',
        reasons: qualityWarnings.map(item => item.message),
      }
    : null
  const approvalBlocker = ['accepted', 'accepted_with_warnings'].includes(admissionStatus)
    ? null
    : admissionApprovalBlocker || legacyApprovalBlocker
  const report = reportPayload(latestReport)
  const revision = revisionPayload(latestRevision)
  const score = extractQualityScore(proseAdmission || {}) ?? extractQualityScore(quality)
  const qualityStatus = firstNonEmpty(quality?.status, latestQuality?.status)
  const currentReport = reportBelongsToCurrentQualityCycle({
    reportRef: latestReportRef,
    qualityRef: latestQualityRef,
    revisionRef: latestRevisionRef,
  }) ? report : {}
  const deslopGateDiagnostics = buildDeslopGateDiagnosticsSummary(quality)
  const mustFix = extractMustFix(quality, currentReport)
  const optionalImprovements = extractOptionalImprovements(quality, report)
  const deliveryRiskQueue = buildDeliveryRiskQueue({
    mustFix,
    storylineSync,
    storyUnitSync,
    signatureSceneSync,
    readabilityReview,
    coreDrift,
    runwaySync,
    readerPayoffSync,
    readerExpectationSync,
    qualityAuditSync,
    qualityAuditRepairReceiptSync,
    chapterHandoffSync,
    chapterHandoffDeltaSync,
    writePreparation,
    intentConfirmationSync,
    benchmarkRecallSync,
    sourceReadiness,
    stateTracking,
    styleBoundary,
    informationFlow,
    expectationThreshold,
    storyLoop,
    emotionalArc,
    chapterHook,
    paragraphHook,
    suspense,
    assetLinkage,
    dialogue,
    plotDynamics,
    characterRelation,
    characterBehavior,
    conflictStructure,
    bridgeUnit,
    reversal,
    showdown,
    opening,
    proseCraft,
    sceneCardDirective,
    punctuationTone,
    contentRubric,
    targetReader,
    genrePositioning,
    femaleAudience,
    upgradeRhythm,
    chapterStructure,
    chapterProgression,
    informationLoad,
    longformContinuity,
    coreContractCheck,
    continuityHeat,
    revisionReceiptCheck,
    deslopRepairCheck,
    proseMeta,
    serialRiskRepair,
    chapterHookQuality,
    readerRetentionCheck,
    readerRetentionSync,
    chapterAttraction,
    storyDriveSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    innovationSync,
    volumeBeatSync,
    blueprintReceipt,
    revisionReceipt,
    deliveryRiskReceipt,
    sceneCardReceipt,
    qualityAudit,
    platformRubric,
    approvalBlocker,
    governanceRecheckSync,
  })
  const storyStateSynced = storyStateStatus
    ? storyStateStatus === 'synced'
    : Number(args.storyState?.last_updated_chapter || 0) >= Number(args.nextChapter?.chapter_no || 0)
  const latestEditorReportSummary = firstNonEmpty(report?.summary, latestReport?.summary)
  const latestRevisionSummary = firstNonEmpty(revision?.revision_summary, latestRevision?.summary)
  const revisionNeedsRecheck = Boolean(
    latestQualityRef
    && latestRevisionRef
    && compareReviewRefs(latestRevisionRef, latestQualityRef) > 0,
  )
  const scoreNeedsRevision = score !== null && score < QUALITY_PASS_THRESHOLD
  const qualityNeedsRevision = Boolean(
    scoreNeedsRevision
    || mustFix.length > 0
    || Boolean(approvalBlocker)
    || quality?.needs_revision === true
    || quality?.passed === false,
  )
  const secondaryActions: Array<{ key: WritingCockpitActionKey; label: string }> = [
    { key: 'review_draft', label: '查看交稿质检' },
    { key: 'open_editor_reports', label: ACTION_LABELS.open_editor_reports },
    { key: 'open_version_history', label: ACTION_LABELS.open_version_history },
  ]

  if (admissionStatus === 'accepted_with_warnings' && (scoreNeedsRevision || mustFix.length > 0 || qualityWarnings.length > 0)) {
    secondaryActions.unshift({ key: 'apply_editor_revision', label: ACTION_LABELS.apply_editor_revision })
  }
  const needsStoryStateSync = Boolean(storyStatePanel && ['pending', 'skipped', 'lagging'].includes(storyStatePanel.status))
  if (needsStoryStateSync) {
    secondaryActions.unshift({
      key: 'sync_story_state',
      label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state,
    })
  }

  const admissionCommon = {
    storylineSync, storyUnitSync, assetIntake, ipSceneIntake, signatureSceneSync, readabilityReview,
    deslopGateDiagnostics, coreDrift, runwaySync, readerPayoffSync, readerExpectationSync,
    qualityAuditSync, qualityAuditRepairReceiptSync, chapterHandoffSync, chapterHandoffDeltaSync,
    writePreparation, intentConfirmationSync, benchmarkRecallSync, sourceReadiness, stateTracking,
    styleBoundary, informationFlow, expectationThreshold, storyLoop, emotionalArc, chapterHook,
    paragraphHook, suspense, assetLinkage, dialogue, plotDynamics, characterRelation, characterBehavior,
    conflictStructure, bridgeUnit, reversal, showdown, opening, proseCraft, punctuationTone, contentRubric,
    targetReader, genrePositioning, femaleAudience, upgradeRhythm, chapterStructure, chapterProgression,
    informationLoad, longformContinuity, coreContractCheck, continuityHeat, revisionReceiptCheck,
    deslopRepairCheck, proseMeta, serialRiskRepair, chapterHookQuality, readerRetentionCheck,
    readerRetentionSync, chapterAttraction, storyDriveSync, characterArcSync, chapterBenchmarkSync,
    styleSampleSync, first30RetentionRecheck, innovationSync, volumeBeatSync, blueprintReceipt,
    revisionReceipt, deliveryRiskReceipt, sceneCardReceipt, qualityAudit, platformRubric, governanceRecheckSync,
    deliveryRiskQueue, deliveryRiskConvergence, qualityScore: score, qualityStatus, mustFix,
    optionalImprovements, latestQualityReviewId: latestQuality?.id || null,
    latestEditorReportId: latestReport?.id || null, latestRevisionReviewId: latestRevision?.id || null,
    latestEditorReportSummary, latestRevisionSummary, storyStateSynced, secondaryActions,
  }

  if (admissionStatus === 'accepted_with_warnings') {
    const storyReason = needsStoryStateSync
      ? (storyStatePanel?.headline || '正文已入库，故事状态待补同步')
      : ''
    return {
      visible: true,
      acceptanceStatus: needsStoryStateSync ? 'needs_state_sync' : 'delivered_with_warnings',
      ...admissionFields,
      statusLabel: needsStoryStateSync ? '已入库，待同步状态机' : '已入库，建议修订',
      acceptanceReasons: [
        storyReason,
        ...qualityWarnings.map(item => item.message),
        ...postCommitWarnings.map(item => item.message),
      ].filter(Boolean).slice(0, 4),
      ...admissionCommon,
      approvalBlocker: null,
      recommendedAcceptanceAction: needsStoryStateSync
        ? { key: 'sync_story_state', label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state }
        : { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
      shouldAutoExpandAcceptance: needsStoryStateSync || Boolean(storyStatePanel?.reasons?.length),
    }
  }

  if (admissionStatus === 'accepted') {
    const storyReason = needsStoryStateSync
      ? (storyStatePanel?.headline || '正文已入库，故事状态待补同步')
      : '正文已入库，可以继续下一章。'
    return {
      visible: true,
      acceptanceStatus: needsStoryStateSync ? 'needs_state_sync' : 'delivered',
      ...admissionFields,
      statusLabel: needsStoryStateSync ? '已入库，待同步状态机' : '已入库',
      acceptanceReasons: [storyReason, ...(storyStatePanel?.reasons || [])].filter(Boolean).slice(0, 4),
      ...admissionCommon,
      approvalBlocker: null,
      recommendedAcceptanceAction: needsStoryStateSync
        ? { key: 'sync_story_state', label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state }
        : { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
      shouldAutoExpandAcceptance: needsStoryStateSync,
    }
  }

  if (admissionStatus === 'blocked_invalid') {
    return {
      visible: true,
      acceptanceStatus: 'needs_revision',
      ...admissionFields,
      statusLabel: '正文无效，未入库',
      acceptanceReasons: qualityWarnings.map(item => item.message).concat('正文未通过有效性检查且未入库。').slice(0, 3),
      ...admissionCommon,
      approvalBlocker,
      recommendedAcceptanceAction: { key: 'open_generation_diagnostics', label: ACTION_LABELS.open_generation_diagnostics },
      shouldAutoExpandAcceptance: true,
    }
  }

  if (!latestQuality) {
    return {
      visible: true,
      acceptanceStatus: 'needs_quality_check',
      ...admissionFields,
      statusLabel: '需复检',
      acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
      ...admissionCommon,
      approvalBlocker,
      qualityScore: null,
      latestQualityReviewId: null,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: ACTION_LABELS.refresh_current_quality },
      shouldAutoExpandAcceptance: true,
    }
  }
  if (revisionNeedsRecheck) {
    return {
      visible: true,
      acceptanceStatus: 'needs_recheck',
      ...admissionFields,
      statusLabel: '修订后需复检',
      acceptanceReasons: ['本章已有修订记录，修订时间晚于最新质量复检。'],
      ...admissionCommon,
      approvalBlocker,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: ACTION_LABELS.refresh_current_quality },
      shouldAutoExpandAcceptance: true,
    }
  }
  if (qualityNeedsRevision) {
    const hasReportFix = Boolean(latestReport && extractMustFix({}, currentReport).length > 0)
    const key: WritingCockpitActionKey = hasReportFix ? 'apply_editor_revision' : 'create_editor_report'
    return {
      visible: true,
      acceptanceStatus: 'needs_revision',
      ...admissionFields,
      statusLabel: '需修订',
      acceptanceReasons: [
        approvalBlocker ? `${approvalBlocker.label}：${approvalBlocker.detail}` : '',
        scoreNeedsRevision ? `质量分 ${score} 低于 ${QUALITY_PASS_THRESHOLD}` : '',
        mustFix.length > 0 ? `必须修复：${mustFix.slice(0, 2).join('；')}` : '',
      ].filter(Boolean).slice(0, 3),
      ...admissionCommon,
      approvalBlocker,
      recommendedAcceptanceAction: { key, label: ACTION_LABELS[key] },
      shouldAutoExpandAcceptance: true,
    }
  }
  if (!storyStateSynced) {
    return {
      visible: true,
      acceptanceStatus: 'needs_state_sync',
      ...admissionFields,
      statusLabel: '需同步故事状态',
      acceptanceReasons: [
        storyStatePanel?.headline || `故事状态还没有同步到第 ${args.nextChapter.chapter_no} 章。`,
        ...(storyStatePanel?.reasons || []),
      ].filter(Boolean).slice(0, 4),
      ...admissionCommon,
      approvalBlocker,
      recommendedAcceptanceAction: {
        key: 'sync_story_state',
        label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state,
      },
      shouldAutoExpandAcceptance: true,
    }
  }
  return {
    visible: true,
    acceptanceStatus: 'ready_to_accept',
    ...admissionFields,
    statusLabel: '可验收',
    acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
    ...admissionCommon,
    approvalBlocker: null,
    recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
    shouldAutoExpandAcceptance: false,
  }

}
