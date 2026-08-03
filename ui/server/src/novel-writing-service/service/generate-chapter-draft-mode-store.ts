import {
  commitNovelChapterAcceptance,
} from '../../novel'
import { isMcpError } from '../../mcp/errors'
import {
  buildChapterProseStoragePatch,
  resolveChapterProseVersionSource,
} from '../../novel-writing/chapter-prose-storage-patch'
import {
  buildSkippedPostDeliveryStoryStateUpdate,
} from '../../novel-writing/post-delivery-story-state-update'
import {
  classifyProseAdmission,
  markBlockedInvalidError,
  validateMinimalChapterProse,
} from '../../novel-writing/prose-admission-policy'
import {
  evaluateResistanceAdmission,
} from '../../novel-writing/human-webnovel-resistance'
import { resolveFingerprintContractInfo } from '../../novel-writing/fingerprint-contract-resolver'
import { buildFingerprintScoreReviewRecord } from '../../fingerprint-contract-scores'
import { BUILTIN_CONTRACT_SET } from '../../fingerprint-contract-store'
import type {
  ProseAdmissionHardFailure,
  ProseAdmissionWarning,
} from '../../novel-writing/prose-admission-policy'
import {
  countProseChars,
} from '../../novel-writing/word-target'
import {
  buildReferenceUsageReviewRecord,
} from '../../routes/novel-reference-service'
import {
  asArray,
} from '../../routes/novel-route-utils'
import {
  formatAdmissionError,
} from '../quality/admission-error'
import {
  collectStructuredReviewWarnings,
  proseAdmissionWarning,
} from '../quality/prose-transport-admission'
import {
  isAbortError,
} from './runtime-helpers'
import {
  acceptanceBindingFingerprintFromGenerationSource,
  acceptanceChapterGenerationSourceFingerprintFromGenerationSource,
} from '../generation-source/types'
import { isChapterGenerationSourceError } from '../generation-source/errors'
import {
  storeDraftModeSyncReviews,
} from './generate-chapter-draft-sync-reviews'
import {
  applyPostCommitAdmissionWarnings,
  createPostCommitWarningRunner,
  resolveReturnedAdmissionStatus,
  resyncChapterPlanAlignmentAfterProseStore,
} from './generate-chapter-post-commit'

export async function runDraftModeAdmissionAndStore(args: {
  isDraftOnly: boolean
  isDraftReviewOnly: boolean
  activeWorkspace: string
  projectId: number
  project: any
  chapter: any
  finalText: string
  finalContinuityNotes: any
  finalSceneBreakdown: any
  generatedTitlePatch: any
  selfCheck: any
  qualityLoop: any
  qualityLoopDiagnostics: any
  qualityGateReview: any
  qualityWarningCandidates: ProseAdmissionWarning[]
  openingContinuityFailures: ProseAdmissionHardFailure[]
  draftQualityDecision: any
  approvalPolicy: any
  approvals: any
  approvalRequired: (...a: any[]) => any
  buildReferenceUsageReport: (...a: any[]) => any
  getReferenceSafetyDecision: (...a: any[]) => any
  explainReferenceSafety: (...a: any[]) => any
  buildMigrationAudit: (...a: any[]) => any
  storeGeneratedReviewRecord: (record: any) => any
  pendingGeneratedReviews: any[]
  throwIfChapterGenerationAborted: () => void
  onStage: (...a: any[]) => any
  runtime: any
  buildProseQualityReview: (...a: any[]) => any
  mergeChapterRawPayload: (...a: any[]) => any
  editorRewrite: any
  humanizePostprocess?: any
  productionMode: string
  draftPromptDiagnostics: any
  ohStoryDeliveryReceipts: any
  postDraftDirector: any
  proseRevisionReceiptSync: any
  deslopRepairReceiptSync: any
  qualityAuditRepairReceiptSync: any
  nextChapterQualityPlanReceiptSync: any
  statusFilterReceiptSync: any
  writePreparationReceiptSync: any
  revisionContextReceiptSync: any
  revisionCascadeImpactSync: any
  revisionScopeGuardSync: any
  deterministicProseCleanup: any
  configSnapshot: any
  finalReviewContextPackage: any
  preStoreReceiptSyncContextPackage: any
  contextPackage: any
}) {
  const {
    isDraftOnly,
    isDraftReviewOnly,
    activeWorkspace,
    projectId,
    project,
    chapter,
    finalText,
    finalContinuityNotes,
    finalSceneBreakdown,
    generatedTitlePatch,
    selfCheck,
    qualityLoop,
    qualityLoopDiagnostics,
    qualityGateReview,
    qualityWarningCandidates,
    openingContinuityFailures,
    draftQualityDecision,
    approvalPolicy,
    approvals,
    approvalRequired,
    buildReferenceUsageReport,
    getReferenceSafetyDecision,
    explainReferenceSafety,
    buildMigrationAudit,
    storeGeneratedReviewRecord,
    pendingGeneratedReviews,
    throwIfChapterGenerationAborted,
    onStage,
    runtime,
    buildProseQualityReview,
    mergeChapterRawPayload,
    editorRewrite,
    humanizePostprocess = null,
    productionMode,
    draftPromptDiagnostics,
    ohStoryDeliveryReceipts,
    postDraftDirector,
    proseRevisionReceiptSync,
    deslopRepairReceiptSync,
    qualityAuditRepairReceiptSync,
    nextChapterQualityPlanReceiptSync,
    statusFilterReceiptSync,
    writePreparationReceiptSync,
    revisionContextReceiptSync,
    revisionCascadeImpactSync,
    revisionScopeGuardSync,
    deterministicProseCleanup,
    configSnapshot,
    finalReviewContextPackage,
    preStoreReceiptSyncContextPackage,
    contextPackage,
  } = args

  const draftResistanceAdmission = evaluateResistanceAdmission(finalText)
  const fingerprintContractInfo = resolveFingerprintContractInfo()
  const draftModeHardAdmission = classifyProseAdmission({
    hard_failures: [
      ...validateMinimalChapterProse(finalText).failures,
      ...openingContinuityFailures,
      ...asArray(qualityLoop.decision?.hard_failures)
        .filter((failure: any) => failure?.source === 'deterministic' && failure?.key === 'canonical_proper_noun_conflict')
        .map((failure: any) => ({
          code: 'canonical_proper_noun_conflict',
          source: 'canonical_continuity' as const,
          message: failure?.message || '正文与高置信正史专名冲突。',
          details: failure,
        })),
      // System-wide: detector hard risks must never soft-pass into store.
      ...draftResistanceAdmission.hard_failures,
    ],
  })
  if (draftModeHardAdmission.hard_failures.length) {
    const primaryFailure = draftModeHardAdmission.hard_failures[0]
    throw markBlockedInvalidError(Object.assign(new Error(primaryFailure.message), {
      code: primaryFailure.code === 'opening_handoff_disconnected'
        ? 'PROSE_ADMISSION_BLOCKED_INVALID'
        : primaryFailure.source === 'canonical_continuity'
          ? 'PROSE_QUALITY_GATE_BLOCKED'
          : primaryFailure.source === 'detector_resistance'
            ? 'PROSE_RESISTANCE_GATE_BLOCKED'
            : 'PROSE_INVALID',
      quality_loop: qualityLoopDiagnostics,
      resistance_hard: primaryFailure.source === 'detector_resistance' ? primaryFailure : undefined,
      // Always expose residual prose for harness packaging / Zhuque inspection even when store is blocked.
      chapter_text: finalText,
      finalText,
      text: finalText,
      details: { ...(primaryFailure as any)?.details, chapter_text: finalText },
    }), primaryFailure)
  }
  qualityWarningCandidates.push(
    ...collectStructuredReviewWarnings(qualityGateReview),
    ...asArray(draftQualityDecision?.hard_failures).map((failure: any) => proseAdmissionWarning('quality', failure?.key || 'draft_quality_gate', failure?.message || failure?.evidence || failure?.key, failure)),
    ...asArray(draftQualityDecision?.advisory_failures).map((message: any) => proseAdmissionWarning('quality', 'draft_quality_advisory', message)),
  )
  let draftReferenceReport: any = { quality_assessment: { risk_level: 'unknown' }, unavailable: true }
  let draftSafetyDecision: any = { blocked: false, score: null, copy_hit_count: 0, reasons: [] }
  let draftSafetyExplanation: any = 'reference review unavailable'
  let draftMigrationAudit: any = { passed: false, unavailable: true }
  try {
    draftReferenceReport = await buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText, { persist: false })
    draftSafetyDecision = getReferenceSafetyDecision(project, draftReferenceReport)
    draftSafetyExplanation = explainReferenceSafety(draftReferenceReport, draftSafetyDecision)
    draftMigrationAudit = buildMigrationAudit(project, draftReferenceReport, draftSafetyExplanation)
    await storeGeneratedReviewRecord(buildReferenceUsageReviewRecord(project, draftReferenceReport))
  } catch (error) {
    if (isAbortError(error)) throw error
    qualityWarningCandidates.push(proseAdmissionWarning('review', 'reference_review_unavailable', formatAdmissionError(error, 300)))
  }
  await onStage('safety', { status: draftSafetyDecision.blocked ? 'failed' : 'success', score: draftSafetyDecision.score, copy_hit_count: draftSafetyDecision.copy_hit_count, risk_level: draftReferenceReport?.quality_assessment?.risk_level })
  if (draftSafetyDecision.blocked) {
    throw markBlockedInvalidError(Object.assign(new Error('仿写安全阈值未通过'), {
      code: 'REFERENCE_SAFETY_BLOCKED',
      referenceReport: draftReferenceReport,
      safetyDecision: draftSafetyDecision,
      safetyExplanation: draftSafetyExplanation,
      migrationAudit: draftMigrationAudit,
    }), {
      code: 'reference_safety_blocked',
      source: 'safety',
      message: '仿写安全阈值明确阻止正文入库。',
      details: { safety_decision: draftSafetyDecision },
    })
  }
  const draftSafetyApprovalRequired = approvalRequired(approvalPolicy, 'safety', approvals, {
    score: draftSafetyDecision.score,
    copy_hit_count: draftSafetyDecision.copy_hit_count,
    risk_level: draftReferenceReport?.quality_assessment?.risk_level,
  })
  if (draftSafetyApprovalRequired || String(draftReferenceReport?.quality_assessment?.risk_level || '').toLowerCase() !== 'low' || asArray(draftSafetyDecision?.reasons).length) {
    qualityWarningCandidates.push(proseAdmissionWarning('review', 'safety_review', draftSafetyExplanation || '仿写安全报告需要复核。'))
  }
  const draftModeAdmissionDecision = classifyProseAdmission({ warnings: qualityWarningCandidates })
  const draftModeStoryStateWarning = {
    skipped: true,
    reason: isDraftOnly ? 'draft_only production mode' : 'draft_review production mode',
  }
  const draftModeProseAdmission = {
    status: draftModeAdmissionDecision.status as 'accepted' | 'accepted_with_warnings',
    quality_score: Number.isFinite(Number(selfCheck?.review?.score)) ? Number(selfCheck.review.score) : null,
    quality_warnings: draftModeAdmissionDecision.warnings,
    story_state_status: 'pending' as const,
    story_state_warning: draftModeStoryStateWarning,
  }
  const draftModeChapterPatch = buildChapterProseStoragePatch({
    chapter,
    generatedTitlePatch,
    finalText,
    finalContinuityNotes,
    finalSceneBreakdown,
    ohStoryDeliveryReceipts,
    postDraftDirector,
    generationSourceProvenance: draftPromptDiagnostics?.generation_source,
    humanizePostprocess,
    proseAdmission: draftModeProseAdmission,
  })
  let updatedReviewedDraft: any = { ...chapter, ...draftModeChapterPatch }
  const draftModeQualityReview = buildProseQualityReview(draftModeAdmissionDecision.status === 'accepted' ? 'ok' : 'warn', draftQualityDecision, '', {
    proseAdmission: draftModeProseAdmission,
    referenceReport: draftReferenceReport,
    safetyDecision: draftSafetyDecision,
    migrationAudit: draftMigrationAudit,
  })
  const draftSyncBundle = await storeDraftModeSyncReviews({
    projectId,
    project,
    chapter,
    updatedReviewedDraft,
    contextPackage,
    finalText,
    activeWorkspace,
    preStoreReceiptSyncContextPackage,
    storeGeneratedReviewRecord,
  })
  updatedReviewedDraft = draftSyncBundle.updatedReviewedDraft
  const {
    draftProseMetaSync,
    draftDialogueSync,
    draftCharacterBehaviorSync,
    draftAssetLinkageSync,
    draftStateTrackingSync,
    draftSourceReadinessSync,
    draftIntentConfirmationSync,
    draftContinuityHeatSync,
    draftConflictStructureSync,
    draftUpgradeRhythmSync,
    draftTargetReaderSync,
    draftGenrePositioningSync,
    draftPlotSpecialTopicsSync,
    draftFemaleAudienceSync,
    draftPlotDynamicsSync,
    draftStoryPowerSync,
    draftCharacterRelationSync,
    draftChapterAttractionReview,
    draftStoryDriveSync,
    draftStoryLoopSync,
    draftInformationFlowSync,
    draftEmotionalArcSync,
    draftCharacterArcSync,
    draftChapterBlueprintSync,
    draftSceneCardReceiptSync,
    draftDeliveryRiskReceiptSync,
    draftChapterBenchmarkSync,
    draftBenchmarkRecallSync,
    draftStyleBoundarySync,
    draftStyleSampleSync,
    draftInnovationSync,
    draftVolumeBeatSync,
    draftRunwaySync,
    draftChapters,
    draftChapterTitleUniquenessSync,
    draftChapterHandoffSync,
    draftReaderExpectationSync,
    draftExpectationThresholdSync,
    draftChapterHookSync,
    draftParagraphHookSync,
    draftSuspenseSync,
    draftReversalSync,
    draftShowdownSync,
    draftOpeningSync,
    draftProseCraftSync,
    draftPunctuationToneSync,
    draftQualityAuditSync,
    draftPayoffSetupSync,
    draftSpectatorReactionSync,
    draftBridgeUnitSync,
    draftBeatCoolingSync,
    draftReaderPayoffSync,
    draftReaderRetentionSync,
    draftSignatureSceneSync,
    draftStoryUnitSync,
    draftCoreDrift,
    draftCoreContractSync,
  } = draftSyncBundle
  try {
    await onStage('store', { status: 'running' })
    await runtime?.hooks?.beforeChapterStore?.({ chapterId: chapter.id, finalText })
    throwIfChapterGenerationAborted()
    const chapterSourceFingerprint = acceptanceChapterGenerationSourceFingerprintFromGenerationSource(
      draftPromptDiagnostics?.generation_source,
    )
    const bindingFingerprint = chapterSourceFingerprint
      ? ''
      : acceptanceBindingFingerprintFromGenerationSource(draftPromptDiagnostics?.generation_source)
    const draftAcceptance = await commitNovelChapterAcceptance(activeWorkspace, {
      chapter_id: chapter.id,
      chapter_patch: draftModeChapterPatch,
      ...(chapterSourceFingerprint ? {
        expected_chapter_generation_source_fingerprint: chapterSourceFingerprint,
      } : {}),
      ...(bindingFingerprint ? {
        expected_prose_generation_source_fingerprint: bindingFingerprint,
      } : {}),
      version_source: resolveChapterProseVersionSource({ editorRewrite }),
      reviews: [
        ...pendingGeneratedReviews,
        buildFingerprintScoreReviewRecord({
          projectId,
          chapterId: chapter.id,
          chapterNo: Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0) || 0,
          setId: fingerprintContractInfo?.set_id || BUILTIN_CONTRACT_SET.id,
          setLabel: fingerprintContractInfo?.set_label || BUILTIN_CONTRACT_SET.label,
          contractName: draftResistanceAdmission.report.contract_name,
          locked: Boolean(fingerprintContractInfo?.locked),
          contractScore: draftResistanceAdmission.report.contract_score,
          textChars: String(finalText || '').replace(/\s+/g, '').length,
          createdAt: new Date().toISOString(),
        }),
        draftModeQualityReview,
      ].filter(Boolean),
    })
    updatedReviewedDraft = draftAcceptance.chapter
  } catch (error) {
    if (isAbortError(error)) throw error
    if (isChapterGenerationSourceError(error) && error.code === 'GENERATION_SOURCE_CHANGED') throw error
    if (isMcpError(error) && error.code === 'MCP_BINDING_CHANGED') throw error
    throw markBlockedInvalidError(error, {
      code: 'atomic_acceptance_failed',
      source: 'atomic',
      message: '章节原子验收失败，未写入任何业务数据。',
    })
  }
  const {
    warnings: draftPostCommitWarnings,
    runPostCommitBestEffort: runDraftPostCommitBestEffort,
  } = createPostCommitWarningRunner(formatAdmissionError)
  await runDraftPostCommitBestEffort('after_commit_hook', () => runtime?.hooks?.afterChapterCommit?.({ chapterId: chapter.id, finalText }))
  await runDraftPostCommitBestEffort('store_stage', () => onStage('store', { status: 'success', word_count: countProseChars(finalText), scene_status: 'accepted' }))
  await runDraftPostCommitBestEffort('progress_resync_next_chapters', async () => {
    updatedReviewedDraft = await resyncChapterPlanAlignmentAfterProseStore({
      activeWorkspace,
      projectId,
      chapter,
      chapterPatch: draftModeChapterPatch,
      updated: updatedReviewedDraft,
      source: 'post_draft_store',
    })
  })
  await runDraftPostCommitBestEffort('story_state_stage', () => onStage('story_state', {
    status: 'skipped',
    reason: isDraftOnly
      ? '初稿模式不更新状态机，避免草稿污染长期记忆'
      : '自检模式不更新状态机，确认后可继续完整流水线',
  }))
  const draftReturnedAdmissionStatus = resolveReturnedAdmissionStatus(draftModeProseAdmission.status, draftPostCommitWarnings)
  updatedReviewedDraft = await applyPostCommitAdmissionWarnings({
    warnings: draftPostCommitWarnings,
    proseAdmission: draftModeProseAdmission,
    returnedAdmissionStatus: draftReturnedAdmissionStatus,
    mergeChapterRawPayload,
    activeWorkspace,
    chapterId: chapter.id,
    formatAdmissionError,
    chapterLike: updatedReviewedDraft,
  })
  return {
    chapter: updatedReviewedDraft,
    score: selfCheck?.review?.score ?? null,
    admission_status: draftReturnedAdmissionStatus,
    quality_score: draftModeProseAdmission.quality_score,
    quality_warnings: draftModeProseAdmission.quality_warnings,
    story_state_status: draftModeProseAdmission.story_state_status,
    story_state_warning: draftModeStoryStateWarning,
    post_commit_warnings: draftPostCommitWarnings,
    revised: false,
    humanize_postprocess: humanizePostprocess,
    production_mode: productionMode,
    completed_stage: 'store',
    prompt_diagnostics: draftPromptDiagnostics,
    quality_loop: {
      rounds: qualityLoop.rounds.map((item: any) => ({ round: item.round, accepted: item.selection.accepted, reason: item.selection.reason })),
      decision: qualityLoop.decision,
    },
    post_draft_director: postDraftDirector,
    oh_story_delivery_receipts: ohStoryDeliveryReceipts,
    story_state_update: buildSkippedPostDeliveryStoryStateUpdate({
      proseRevisionReceiptSync,
      deslopRepairReceiptSync,
      qualityAuditRepairReceiptSync,
      nextChapterQualityPlanReceiptSync,
      statusFilterReceiptSync,
      writePreparationReceiptSync,
      revisionContextReceiptSync,
      revisionCascadeImpactSync,
      revisionScopeGuardSync,
      deterministicProseCleanup,
      proseMetaSync: draftProseMetaSync,
      dialogueSync: draftDialogueSync,
      characterBehaviorSync: draftCharacterBehaviorSync,
      assetLinkageSync: draftAssetLinkageSync,
      stateTrackingSync: draftStateTrackingSync,
      sourceReadinessSync: draftSourceReadinessSync,
      intentConfirmationSync: draftIntentConfirmationSync,
      continuityHeatSync: draftContinuityHeatSync,
      conflictStructureSync: draftConflictStructureSync,
      upgradeRhythmSync: draftUpgradeRhythmSync,
      targetReaderSync: draftTargetReaderSync,
      genrePositioningSync: draftGenrePositioningSync,
      plotSpecialTopicsSync: draftPlotSpecialTopicsSync,
      femaleAudienceSync: draftFemaleAudienceSync,
      plotDynamicsSync: draftPlotDynamicsSync,
      storyPowerSync: draftStoryPowerSync,
      characterRelationSync: draftCharacterRelationSync,
      chapterAttractionReview: draftChapterAttractionReview,
      storyDriveSync: draftStoryDriveSync,
      storyLoopSync: draftStoryLoopSync,
      informationFlowSync: draftInformationFlowSync,
      emotionalArcSync: draftEmotionalArcSync,
      characterArcSync: draftCharacterArcSync,
      chapterBlueprintSync: draftChapterBlueprintSync,
      sceneCardReceiptSync: draftSceneCardReceiptSync,
      deliveryRiskReceiptSync: draftDeliveryRiskReceiptSync,
      chapterBenchmarkSync: draftChapterBenchmarkSync,
      benchmarkRecallSync: draftBenchmarkRecallSync,
      styleBoundarySync: draftStyleBoundarySync,
      styleSampleSync: draftStyleSampleSync,
      innovationSync: draftInnovationSync,
      volumeBeatSync: draftVolumeBeatSync,
      runwaySync: draftRunwaySync,
      chapterTitleUniquenessSync: draftChapterTitleUniquenessSync,
      chapterHandoffSync: draftChapterHandoffSync,
      readerExpectationSync: draftReaderExpectationSync,
      expectationThresholdSync: draftExpectationThresholdSync,
      chapterHookSync: draftChapterHookSync,
      paragraphHookSync: draftParagraphHookSync,
      suspenseSync: draftSuspenseSync,
      reversalSync: draftReversalSync,
      showdownSync: draftShowdownSync,
      openingSync: draftOpeningSync,
      proseCraftSync: draftProseCraftSync,
      punctuationToneSync: draftPunctuationToneSync,
      qualityAuditSync: draftQualityAuditSync,
      payoffSetupSync: draftPayoffSetupSync,
      spectatorReactionSync: draftSpectatorReactionSync,
      bridgeUnitSync: draftBridgeUnitSync,
      beatCoolingSync: draftBeatCoolingSync,
      readerPayoffSync: draftReaderPayoffSync,
      readerRetentionSync: draftReaderRetentionSync,
      signatureSceneSync: draftSignatureSceneSync,
      storyUnitSync: draftStoryUnitSync,
      coreDrift: draftCoreDrift,
      coreContractSync: draftCoreContractSync,
    }),
    requires_next_chapter_quality_plan_receipts: nextChapterQualityPlanReceiptSync.requires_receipts,
    requires_status_filter_receipts: statusFilterReceiptSync.requires_receipts,
    config_snapshot: configSnapshot,
  }
}
