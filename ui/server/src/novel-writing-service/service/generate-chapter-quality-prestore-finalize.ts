import {
  listNovelChapters,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelOutlines,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  updateNovelChapter,
  } from '../../novel'
import {
  enrichContextWithStrongHandoff,
  } from '../../novel-writing/chapter-handoff-basics'
import {
  enrichContextWithProgressResync,
  } from '../../novel-writing/chapter-progress-ledger'
import {
  buildChapterProseStoragePatch,
  normalizeProseForStorage,
  resolveChapterProseVersionSource,
  } from '../../novel-writing/chapter-prose-storage-patch'
import {
  buildDeterministicProseCleanupReport,
  buildQualityGateReviewWithDeterministicCleanup,
  } from '../../novel-writing/deterministic-prose-cleanup'
import {
  buildChapterAttractionDraftReviewRecord,
  buildChapterCoreDriftDraftReviewRecord,
  buildChapterHandoffDraftReviewRecord,
  buildChapterTitleUniquenessDraftReviewRecord,
  buildCoreContractDraftReviewRecord,
  buildDeliveryRiskReceiptsDraftReviewRecord,
  buildDraftSyncReviewRecord,
  buildPlotSpecialTopicsDraftReviewRecord,
  buildReaderPayoffDraftReviewRecord,
  buildSceneCardReceiptsDraftReviewRecord,
  buildSignatureSceneDraftReviewRecord,
  buildStoryUnitDraftReviewRecord,
  buildStyleSampleDraftReviewRecord,
  } from '../../novel-writing/draft-sync-review-record'
import {
  buildPreStoreStructuralSyncChecks,
  } from '../../novel-writing/pre-store-structural-sync-gate'
import {
  classifyProseAdmission,
  markBlockedInvalidError,
  validateMinimalChapterProse,
} from '../../novel-writing/prose-admission-policy'
import type {
  ProseAdmissionHardFailure,
  ProseAdmissionWarning,
} from '../../novel-writing/prose-admission-policy'
import {
  assessInitialProseOpeningContinuity,
} from '../../novel-writing/prose-candidate-continuity'
import {
  resolveStrictPreflightReadiness,
} from '../../novel-writing/prose-generation-contract'
import {
  buildProseMetaSyncReport,
} from '../../novel-writing/prose-meta'
import {
  shouldRunSynchronousReadabilityReview,
} from '../../novel-writing/prose-quality-contracts'
import {
  proseQualityReviewMaxTokensForAttempt,
  runProseQualityLoop,
  sanitizeProseQualityReviewTransport,
} from '../../novel-writing/prose-quality-loop'
import {
  buildProseQualityReviewRecord,
} from '../../novel-writing/prose-quality-review-record'
import {
  buildPayoffSetupSyncReport,
  buildSpectatorReactionSyncReport,
} from '../../novel-writing/public-payoff-scans'
import {
  resolveEffectiveQualityThreshold,
} from '../../novel-writing/rolling-rhythm-preflight'
import {
  buildSceneCardReceiptSyncReport,
  selectVerifiedSceneBreakdownUpdate,
} from '../../novel-writing/scene-card-execution-scans'
import {
  buildReadabilityReviewRecord,
} from '../../novel-writing/service-review-record'
import {
  buildChapterTitleUniquenessSyncReport,
  buildGeneratedChapterTitlePatch,
} from '../../novel-writing/title-uniqueness'
import {
  applyChapterWordTargetToContext,
  countProseChars,
  evaluateProseWordTarget,
  proseMaxTokensForWordTarget,
  resolveChapterWordTarget,
} from '../../novel-writing/word-target'
import {
  isRestorableWordTargetText,
  recordWordTargetExpansionPatch,
  wordTargetWarningAsError,
} from './generate-chapter-word-target-helpers'
import {
  attachQualityLoopFailureDiagnostics,
} from './generate-chapter-quality-helpers'
import {
  qualityLoopAdmissionWarnings,
  runFinalCandidateQualityRecheck,
} from './generate-chapter-quality-review-executor'
import {
  applyPostCommitAdmissionWarnings,
  createPostCommitWarningRunner,
  resolveReturnedAdmissionStatus,
  resyncChapterPlanAlignmentAfterProseStore,
} from './generate-chapter-post-commit'
import {
  storePreStoreReceiptSyncReviews,
} from './generate-chapter-prestore-receipt-reviews'
import {
  runFullProductionAdmissionAndStore,
} from './generate-chapter-full-production-store'
import {
  runDraftModeAdmissionAndStore,
} from './generate-chapter-draft-mode-store'
import {
  buildOhStoryDirectorForPostDraft,
} from '../../routes/novel-oh-story-director'
import {
  buildReferenceUsageReviewRecord,
} from '../../routes/novel-reference-service'
import {
  asArray,
  buildLLMResultDiagnostics,
  compactPreviousChaptersForProse,
  extractPlainProseFallback,
  formatReviewIssueForStorage,
  getNovelPayload,
  getQualityGateDecision,
  getStoryState,
} from '../../routes/novel-route-utils'
import {
  buildArtifactProtocolReceiptSyncReport,
} from '../post-delivery/artifact-protocol'
import {
  buildChapterCoreDriftReport,
  buildChapterHandoffSyncReport,
  buildCoreContractSyncReport,
  buildProseReviewContextPackage,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
} from '../post-delivery/core-handoff-sync-reports'
import {
  normalizeStoredOhStoryDeliveryReceipts,
} from '../post-delivery/delivery-risk-carry-over'
import {
  buildDeliveryRiskReceiptSyncReport,
  normalizeDeliveryRiskReceipts,
  uniqueDeliveryRiskReceipts,
} from '../post-delivery/delivery-risk-core'
import {
  buildDeslopRepairReceiptSyncReport,
  buildNextChapterQualityPlanReceiptSyncReport,
  buildProseRevisionReceiptSyncReport,
  buildQualityAuditRepairReceiptSyncReport,
  buildRevisionCascadeImpactSyncReport,
  buildRevisionContextReceiptSyncReport,
  buildRevisionScopeGuardSyncReport,
  buildStatusFilterReceiptSyncReport,
  buildWritePreparationReceiptSyncReport,
} from '../post-delivery/delta-sync-reports'
import {
  buildAssetLinkageSyncReport,
  buildBeatCoolingSyncReport,
  buildBenchmarkRecallSyncReport,
  buildBridgeUnitSyncReport,
  buildChapterAttractionReviewReport,
  buildChapterBenchmarkSyncReport,
  buildChapterBlueprintSyncReport,
  buildChapterHookSyncReport,
  buildCharacterArcSyncReport,
  buildCharacterBehaviorSyncReport,
  buildConflictStructureSyncReport,
  buildContinuityHeatSyncReport,
  buildDialogueSyncReport,
  buildEmotionalArcSyncReport,
  buildExpectationThresholdSyncReport,
  buildFemaleAudienceSyncReport,
  buildGenrePositioningSyncReport,
  buildInformationFlowSyncReport,
  buildInnovationSyncReport,
  buildIntentConfirmationSyncReport,
  buildOpeningSyncReport,
  buildParagraphHookSyncReport,
  buildPlotDynamicsSyncReport,
  buildPlotSpecialTopicsSyncReport,
  buildProseCraftSyncReport,
  buildPunctuationToneSyncReport,
  buildQualityAuditSyncReport,
  buildReaderRetentionSyncReport,
  buildReversalSyncReport,
  buildRunwaySyncReport,
  buildShowdownSyncReport,
  buildSignatureSceneSyncReport,
  buildStateTrackingSyncReport,
  buildStoryDriveSyncReport,
  buildStoryLoopSyncReport,
  buildStoryPowerSyncReport,
  buildStoryUnitSyncReport,
  buildStyleBoundarySyncReport,
  buildStyleSampleSyncReport,
  buildSuspenseSyncReport,
  buildTargetReaderSyncReport,
  buildUpgradeRhythmSyncReport,
  buildVolumeBeatSyncReport,
} from '../post-delivery/quality-sync-reports'
import {
  formatAdmissionError,
} from '../quality/admission-error'
import {
  buildCharacterRelationSyncReport,
} from '../quality/character-asset-contracts'
import {
  compileParagraphProseContext,
  proseQualityJson,
} from '../quality/paragraph-prose-context'
import {
  buildFocusedQualityCoreContract,
  buildLegacyCompatibleSelfCheck,
  prepareProseGenerationContract,
  scanProseForQualityLoop,
} from '../quality/prose-quality-entry'
import {
  buildFallbackNextChapterQualityPlan,
  proseQualityDeslopRepairReceiptRisks,
} from '../quality/prose-quality-risks'
import {
  assertCompleteProseTransportResult,
  collectStructuredReviewWarnings,
  proseAdmissionWarning,
} from '../quality/prose-transport-admission'
import {
  mergePostDeliveryReceiptSyncIntoQualityGateReview,
} from '../quality/review-merge'
import {
  buildSourceReadinessSyncReport,
} from '../quality/state-tracking-contracts'
import {
  isAbortError,
  selectProseForChapter,
  throwIfAborted,
} from './runtime-helpers'

import {
  attachQualityLoopFailureDiagnostics,
} from './generate-chapter-quality-helpers'

export async function runQualityPrestoreFinalize(state: Record<string, any>): Promise<any> {
  let {
    activeWorkspace,
    chapter,
    configSnapshot,
    contextPackage,
    draftPromptDiagnostics,
    editorRewrite,
    executeAgent,
    finalContinuityNotes,
    finalSceneBreakdown,
    finalText,
    generationContract,
    getStageModelId,
    initialReviewDecision,
    isDraftOnly,
    isDraftReviewOnly,
    llmControlOptions,
    memePolish,
    ohStoryDeliveryReceipts,
    onStage,
    options,
    preferredModelId,
    productionMode,
    project,
    projectId,
    qualityGateProject,
    qualityLoop,
    qualityLoopDiagnostics,
    qualityLoopWarningCount = 0,
    qualityLoopWarningStartIndex = 0,
    qualityRepairTimeoutMs,
    qualityThreshold,
    qualityWarningCandidates,
    readabilityReview,
    revisionStageStatus,
    runReadabilityReview,
    selfCheck,
    storeGeneratedReviewRecord,
    throwIfChapterGenerationAborted,
    wordTarget,
    wordTargetCompatibility,
    wordTargetExpansionPatches,
  } = state
if (typeof qualityLoop?.final_text === 'string' && finalText !== qualityLoop.final_text) {
  const finalCandidateQualityLoop = await runFinalCandidateQualityRecheck({
    activeWorkspace,
    executeAgent,
    finalText,
    generationContract,
    getStageModelId,
    onStage,
    options,
    preferredModelId,
    project,
    qualityRepairTimeoutMs,
    qualityThreshold,
    contextPackage,
    wordTarget,
    wordTargetCompatibility,
    throwIfChapterGenerationAborted,
  })
  const historicalRounds = qualityLoop.rounds
  qualityLoop = {
    ...qualityLoop,
    ...finalCandidateQualityLoop,
    rounds: historicalRounds,
  }
  if (!finalCandidateQualityLoop.quality_warning) delete qualityLoop.quality_warning
  finalText = String(qualityLoop.final_text || finalText)
  const finalQualityLoopWarnings = qualityLoopAdmissionWarnings(qualityLoop)
  qualityWarningCandidates.splice(
    qualityLoopWarningStartIndex,
    qualityLoopWarningCount,
    ...finalQualityLoopWarnings,
  )
  qualityLoopWarningCount = finalQualityLoopWarnings.length
  qualityLoopDiagnostics = {
    rounds: qualityLoop.rounds.map((item: any) => ({
      round: item.round,
      accepted: item.selection.accepted,
      reason: item.selection.reason,
    })),
    decision: qualityLoop.decision,
  }
  selfCheck = buildLegacyCompatibleSelfCheck(qualityLoop)
  if (!(selfCheck.review as any).next_chapter_quality_plan) {
    ;(selfCheck.review as any).next_chapter_quality_plan = buildFallbackNextChapterQualityPlan(
      selfCheck.review,
      contextPackage,
      finalText,
    )
  }
  await onStage('review', {
    status: qualityLoop.decision?.passed ? 'success' : 'warn',
    phase: 'quality_recheck',
    round: 0,
    score: selfCheck?.review?.score ?? null,
    issues: selfCheck?.review?.issues || [],
    quality_gate: qualityLoop.decision,
    scene_status: 'reviewed',
  })
}
if (shouldRunSynchronousReadabilityReview(options, project)) {
  throwIfChapterGenerationAborted()
  await onStage('readability_review', { status: 'running' })
  try {
    readabilityReview = await runReadabilityReview(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
    await storeGeneratedReviewRecord(buildReadabilityReviewRecord({
      projectId,
      chapter,
      readabilityReview,
      memePolish,
      memeIntensityFallback: contextPackage?.chapter_target?.meme_strategy?.intensity,
      formatIssue: formatReviewIssueForStorage,
    }))
    await onStage('readability_review', { status: 'success', score: readabilityReview.readability_score, meme_sense: readabilityReview.meme_sense })
  } catch (readabilityError) {
    if (llmControlOptions?.chapterTaskExecution) throw readabilityError
    if (isAbortError(readabilityError)) throw readabilityError
    const readabilityErrorMessage = formatAdmissionError(readabilityError, 300)
    readabilityReview = { error: readabilityErrorMessage }
    qualityWarningCandidates.push(proseAdmissionWarning('review', 'readability_review_unavailable', readabilityErrorMessage))
    await onStage('readability_review', { status: 'warn', error: formatAdmissionError(readabilityError, 200), reason: '可读性复检失败，不阻塞原验收流程' })
  }
} else {
  readabilityReview = {
    skipped: true,
    deferred: true,
    reason: '可读性复检为非阻塞辅助诊断；需要同步执行时设置 run_readability_review=true。',
  }
  await onStage('readability_review', {
    status: 'skipped',
    deferred: true,
    reason: readabilityReview.reason,
  })
}
let proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(chapter, selfCheck)
let deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(chapter, selfCheck)
let qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(chapter, selfCheck)
let revisionContextReceiptSync = buildRevisionContextReceiptSyncReport(chapter, selfCheck)
let revisionCascadeImpactSync = buildRevisionCascadeImpactSyncReport(chapter, selfCheck)
let revisionScopeGuardSync = buildRevisionScopeGuardSyncReport(chapter, selfCheck)
const cleanupRepairFormatNormalization: any = null
const cleanupRepairPunctuationNormalization: any = null
const cleanupRepairDeslopTermNormalization: any = null
const formatNormalization = { changed: false, change_count: 0, rules: [], skipped_after_quality: true }
const punctuationNormalization = { changed: false, change_count: 0, rules: [], skipped_after_quality: true }
const deslopTermNormalization = { changed: false, change_count: 0, rules: [], skipped_after_quality: true }
const deterministicProseCleanup = qualityLoop.final_scan?.cleanup || buildDeterministicProseCleanupReport(chapter, finalText)
const syncChapterForReceiptEvidence = { ...chapter, chapter_text: finalText }
proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)
deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)
qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)
revisionCascadeImpactSync = buildRevisionCascadeImpactSyncReport(syncChapterForReceiptEvidence, selfCheck)
const revisionReceiptChecks = proseRevisionReceiptSync.status === 'ok'
  ? []
  : [{
      key: 'prose_revision_receipt_sync',
      label: '修订回执未闭环',
      status: 'fail',
      evidence: `${proseRevisionReceiptSync.label}：${proseRevisionReceiptSync.summary}`,
      fix: proseRevisionReceiptSync.next_actions?.join('；') || '重新修订并逐条输出 revision_receipts.changed_evidence。',
      missed_count: proseRevisionReceiptSync.missed_count,
    }]
const deslopRepairReceiptRisks = proseQualityDeslopRepairReceiptRisks({ self_check: selfCheck }, finalText)
const deslopRepairChecks = deslopRepairReceiptRisks.map((item: any) => ({
  key: 'deslop_repair_receipt_sync',
  label: '去AI味修复回执未闭环',
  status: 'fail',
  evidence: [item.gate, item.label, item.evidence].filter(Boolean).join('；') || item.risk,
  fix: `重新修复 ${item.gate || 'Gate A-G'} ${item.label || '去AI味残留'}，并在 deslop_repair_receipts.changed_evidence 中引用修订后正文证据。`,
  remaining_risk: item.risk,
}))
const missingDeslopRepairReceiptChecks = deslopRepairReceiptSync.status === 'ok' || Number(deslopRepairReceiptSync.receipt_count || 0) > 0
  ? []
  : [{
      key: 'missing_deslop_repair_receipts',
      label: '去AI味修复回执未生成',
      status: 'fail',
      evidence: `${deslopRepairReceiptSync.label}：${deslopRepairReceiptSync.summary}`,
      fix: deslopRepairReceiptSync.next_actions?.join('；') || '重新复核去AI味修复结果，并逐条输出 deslop_repair_receipts.changed_evidence。',
      missed_count: deslopRepairReceiptSync.missed_count,
    }]
const missingQualityAuditRepairReceiptChecks = qualityAuditRepairReceiptSync.status === 'ok' || Number(qualityAuditRepairReceiptSync.receipt_count || 0) > 0
  ? []
  : [{
      key: 'missing_quality_audit_repair_receipts',
      label: '质量诊断修复回执未生成',
      status: 'fail',
      evidence: `${qualityAuditRepairReceiptSync.label}：${qualityAuditRepairReceiptSync.summary}`,
      fix: qualityAuditRepairReceiptSync.next_actions?.join('；') || '重新复核质量诊断修复结果，并逐条输出 quality_audit_repair_receipts.changed_evidence。',
      missed_count: qualityAuditRepairReceiptSync.missed_count,
    }]
const qualityAuditRepairReceiptChecks = qualityAuditRepairReceiptSync.status === 'ok' || Number(qualityAuditRepairReceiptSync.receipt_count || 0) <= 0
  ? []
  : [{
      key: 'quality_audit_repair_receipt_sync',
      label: '质量诊断修复回执未闭环',
      status: 'fail',
      evidence: `${qualityAuditRepairReceiptSync.label}：${qualityAuditRepairReceiptSync.summary}`,
      fix: qualityAuditRepairReceiptSync.next_actions?.join('；') || '重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence。',
      missed_count: qualityAuditRepairReceiptSync.missed_count,
    }]
const revisionCascadeImpactChecks = [
  ...asArray(revisionCascadeImpactSync.evidence_missing),
  ...asArray(revisionCascadeImpactSync.evidence_unlocated),
].map((item: any) => ({
  key: 'revision_cascade_impact_evidence',
  label: '修订级联影响证据未闭环',
  status: 'fail',
  evidence: [item?.target, item?.evidence_location_risk || item?.evidenceLocationRisk || item?.evidence, item?.text].filter(Boolean).join('；'),
  fix: revisionCascadeImpactSync.next_actions?.join('；') || '重新修订并让 cascade_impacts.evidence/source_excerpt 引用修订后正文原句。',
  remaining_risk: item?.evidence_location_risk || item?.evidenceLocationRisk || 'cascade_impacts 缺少可核验正文证据。',
}))
const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)
const preStoreStructuralSyncChapter = {
  ...chapter,
  chapter_text: finalText,
  raw_payload: {
    ...(chapter.raw_payload || {}),
    oh_story_delivery_receipts: ohStoryDeliveryReceipts,
  },
}
const preStoreChapterBlueprintSync = buildChapterBlueprintSyncReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
const preStoreBenchmarkRecallSync = buildBenchmarkRecallSyncReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
const preStoreStoryDriveSync = buildStoryDriveSyncReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
const preStoreChapterAttractionReview = buildChapterAttractionReviewReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
const preStoreRunwaySync = buildRunwaySyncReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
const preStoreStructuralSyncChecks = buildPreStoreStructuralSyncChecks({
  chapterBlueprintSync: preStoreChapterBlueprintSync,
  benchmarkRecallSync: preStoreBenchmarkRecallSync,
  storyDriveSync: preStoreStoryDriveSync,
  chapterAttractionReview: preStoreChapterAttractionReview,
  runwaySync: preStoreRunwaySync,
})
let qualityGateReview = buildQualityGateReviewWithDeterministicCleanup({
  ...(selfCheck?.review || {}),
  revised: Boolean(selfCheck.revised),
  quality_audit_checks: [
    ...asArray(selfCheck?.review?.quality_audit_checks || selfCheck?.review?.qualityAuditChecks),
    ...preStoreStructuralSyncChecks,
    ...missingQualityAuditRepairReceiptChecks,
    ...qualityAuditRepairReceiptChecks,
    ...revisionCascadeImpactChecks,
  ],
  revision_receipt_checks: revisionReceiptChecks,
  deslop_repair_checks: [...missingDeslopRepairReceiptChecks, ...deslopRepairChecks],
}, deterministicProseCleanup)
const revisionDeliveryReceipts = selfCheck?.revision?.oh_story_delivery_receipts
  || selfCheck?.revision?.ohStoryDeliveryReceipts
  || {}
ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts({
  ...(ohStoryDeliveryReceipts || {}),
  chapter_blueprint: ohStoryDeliveryReceipts?.chapter_blueprint
    || finalReviewContextPackage?.chapter_target?.chapter_blueprint
    || finalReviewContextPackage?.chapter_target?.chapterBlueprint,
  scene_card_receipts: [
    ...asArray(revisionDeliveryReceipts?.scene_card_receipts || revisionDeliveryReceipts?.sceneCardReceipts),
    ...asArray(selfCheck?.revision?.scene_card_receipts || selfCheck?.revision?.sceneCardReceipts),
    ...asArray(finalSceneBreakdown)
      .map((scene: any) => scene?.scene_card_receipts || scene?.sceneCardReceipts)
      .filter(Boolean),
    ...asArray(ohStoryDeliveryReceipts?.scene_card_receipts),
  ],
  delivery_risk_receipts: uniqueDeliveryRiskReceipts([
    ...asArray(ohStoryDeliveryReceipts?.delivery_risk_receipts),
    ...normalizeDeliveryRiskReceipts(selfCheck?.review || {}, finalReviewContextPackage, finalText),
    ...normalizeDeliveryRiskReceipts({
      delivery_risk_receipts: asArray(revisionDeliveryReceipts?.delivery_risk_receipts || revisionDeliveryReceipts?.deliveryRiskReceipts),
    }, finalReviewContextPackage, finalText),
  ]),
  revision_receipts: [
    ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...asArray(selfCheck?.revision?.revision_receipts || selfCheck?.revision?.revisionReceipts),
    ...asArray(ohStoryDeliveryReceipts?.revision_receipts),
  ],
  deslop_repair_receipts: [
    ...asArray(revisionDeliveryReceipts?.deslop_repair_receipts || revisionDeliveryReceipts?.deslopRepairReceipts),
    ...asArray(selfCheck?.revision?.deslop_repair_receipts || selfCheck?.revision?.deslopRepairReceipts),
    ...asArray(ohStoryDeliveryReceipts?.deslop_repair_receipts),
  ],
  quality_audit_repair_receipts: [
    ...asArray(revisionDeliveryReceipts?.quality_audit_repair_receipts || revisionDeliveryReceipts?.qualityAuditRepairReceipts),
    ...asArray(selfCheck?.revision?.quality_audit_repair_receipts || selfCheck?.revision?.qualityAuditRepairReceipts),
    ...asArray(ohStoryDeliveryReceipts?.quality_audit_repair_receipts),
  ],
  artifact_protocol_receipts: [
    ...asArray(revisionDeliveryReceipts?.artifact_protocol_receipts || revisionDeliveryReceipts?.artifactProtocolReceipts),
    ...asArray(selfCheck?.revision?.artifact_protocol_receipts || selfCheck?.revision?.artifactProtocolReceipts),
    ...asArray(ohStoryDeliveryReceipts?.artifact_protocol_receipts),
  ],
  pre_draft_execution_receipts: revisionDeliveryReceipts?.pre_draft_execution_receipts
    || revisionDeliveryReceipts?.preDraftExecutionReceipts
    || selfCheck?.revision?.pre_draft_execution_receipts
    || selfCheck?.revision?.preDraftExecutionReceipts
    || ohStoryDeliveryReceipts?.pre_draft_execution_receipts
    || ohStoryDeliveryReceipts?.preDraftExecutionReceipts,
}) || ohStoryDeliveryReceipts
const nextChapterQualityPlanReceiptSync = buildNextChapterQualityPlanReceiptSyncReport(
  { ...chapter, chapter_text: finalText, raw_payload: { ...(chapter.raw_payload || {}), oh_story_delivery_receipts: ohStoryDeliveryReceipts } },
  finalReviewContextPackage,
  selfCheck,
)
const statusFilterReceiptSync = buildStatusFilterReceiptSyncReport(
  { ...chapter, chapter_text: finalText, raw_payload: { ...(chapter.raw_payload || {}), oh_story_delivery_receipts: ohStoryDeliveryReceipts } },
  finalReviewContextPackage,
  selfCheck,
)
const writePreparationReceiptSync = buildWritePreparationReceiptSyncReport(
  project,
  { ...chapter, raw_payload: { ...(chapter.raw_payload || {}), oh_story_delivery_receipts: ohStoryDeliveryReceipts } },
  finalReviewContextPackage,
  finalText,
  selfCheck,
)
const preStoreReceiptSyncChapter = {
  ...chapter,
  chapter_text: finalText,
  raw_payload: {
    ...(chapter.raw_payload || {}),
    oh_story_delivery_receipts: ohStoryDeliveryReceipts,
  },
}
const preStoreReceiptSyncContextPackage = {
  ...finalReviewContextPackage,
  oh_story_delivery_receipts: ohStoryDeliveryReceipts,
  delivery_receipts: ohStoryDeliveryReceipts,
  chapter_target: {
    ...(finalReviewContextPackage?.chapter_target || {}),
    oh_story_delivery_receipts: ohStoryDeliveryReceipts,
    delivery_receipts: ohStoryDeliveryReceipts,
  },
}
const preStoreSceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, preStoreReceiptSyncChapter, preStoreReceiptSyncContextPackage, finalText)
const preStoreDeliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, preStoreReceiptSyncChapter, preStoreReceiptSyncContextPackage, finalText)
const preStoreArtifactProtocolReceiptSync = buildArtifactProtocolReceiptSyncReport(project, preStoreReceiptSyncChapter, preStoreReceiptSyncContextPackage, finalText)
qualityGateReview = mergePostDeliveryReceiptSyncIntoQualityGateReview(qualityGateReview, {
  nextChapterQualityPlanReceiptSync,
  statusFilterReceiptSync,
  sceneCardReceiptSync: preStoreSceneCardReceiptSync,
})
selfCheck = {
  ...selfCheck,
  review: qualityGateReview,
}
const postDeliveryReceiptChecks = [
  { sync: nextChapterQualityPlanReceiptSync, sync_key: 'next_chapter_quality_plan_receipts_sync', label: '质量续航回执未闭环' },
  { sync: statusFilterReceiptSync, sync_key: 'status_filter_receipts_sync', label: '状态筛选回执未闭环' },
  { sync: writePreparationReceiptSync, sync_key: 'write_preparation_receipts_sync', label: '写前准备回执未闭环' },
  { sync: preStoreSceneCardReceiptSync, sync_key: 'scene_card_receipts_sync', label: '场景回执未闭环' },
  { sync: preStoreDeliveryRiskReceiptSync, sync_key: 'delivery_risk_receipts_sync', label: '交稿风险回执未闭环' },
  { sync: preStoreArtifactProtocolReceiptSync, sync_key: 'artifact_protocol_receipts_sync', label: '项目产物协议回执未闭环' },
]
  .filter((item: any) => item.sync?.status !== 'ok' && Number(item.sync?.missed_count || 0) > 0)
  .map((item: any) => ({
    key: 'post_delivery_receipt_sync',
    sync_key: item.sync_key,
    label: item.label,
    status: 'warn',
    evidence: `${item.sync.label}：${item.sync.summary}`,
    fix: item.sync.next_actions?.join('；') || '补齐 post-delivery receipt，并用正文证据证明写前准备、状态筛选、项目产物协议、质量续航、场景卡或交稿风险已落成。',
    missed_count: item.sync.missed_count,
  }))
if (postDeliveryReceiptChecks.length > 0) {
  qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks
}
const postDraftDirector = buildOhStoryDirectorForPostDraft({
  quality: {
    ...(qualityGateReview || {}),
    story_power_sync: qualityGateReview?.story_power_sync || qualityGateReview?.storyPowerSync || selfCheck?.review?.story_power_sync || selfCheck?.review?.storyPowerSync,
    delivery_risk_receipt_sync: preStoreDeliveryRiskReceiptSync,
    deslop_gate_diagnostics: qualityGateReview?.deslop_gate_diagnostics || qualityGateReview?.deslopGateDiagnostics || selfCheck?.review?.deslop_gate_diagnostics || selfCheck?.review?.deslopGateDiagnostics,
  },
  receipts: ohStoryDeliveryReceipts,
})
const postDraftDirectorPayload = {
  oh_story_delivery_receipts: ohStoryDeliveryReceipts,
  oh_story_director: postDraftDirector,
  ohStoryDirector: postDraftDirector,
}
const draftQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)
const buildProseQualityReview = (status: string, qualityGate: any, summarySuffix = '', extraPayload: any = {}) => buildProseQualityReviewRecord({
  projectId,
  status,
  summarySuffix,
  selfCheck,
  formatIssue: formatReviewIssueForStorage,
  stringifyPayload: proseQualityJson,
  payload: {
    chapterId: chapter.id,
    contextPackage: finalReviewContextPackage,
    editorRewrite,
    memePolish,
    readabilityReview,
    selfCheck,
    ...extraPayload,
    qualityGate,
    postDraftDirectorPayload,
    productionMode,
    configSnapshot,
  },
})

  return {
    finalText,
    finalSceneBreakdown,
    finalContinuityNotes,
    qualityLoop,
    qualityLoopDiagnostics,
    qualityWarningCandidates,
    selfCheck,
    readabilityReview,
    proseRevisionReceiptSync,
    deslopRepairReceiptSync,
    qualityAuditRepairReceiptSync,
    revisionContextReceiptSync,
    revisionCascadeImpactSync,
    revisionScopeGuardSync,
    deterministicProseCleanup,
    formatNormalization,
    punctuationNormalization,
    deslopTermNormalization,
    cleanupRepairFormatNormalization,
    cleanupRepairPunctuationNormalization,
    cleanupRepairDeslopTermNormalization,
    qualityGateReview,
    finalReviewContextPackage,
    nextChapterQualityPlanReceiptSync,
    statusFilterReceiptSync,
    writePreparationReceiptSync,
    preStoreReceiptSyncContextPackage,
    postDraftDirector,
    draftQualityDecision,
    buildProseQualityReview,
  }
}
