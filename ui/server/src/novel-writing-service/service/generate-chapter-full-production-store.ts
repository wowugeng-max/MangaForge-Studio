import {
  commitNovelChapterAcceptance,
  listNovelChapters,
} from '../../novel'
import {
  buildChapterProseStoragePatch,
  resolveChapterProseVersionSource,
} from '../../novel-writing/chapter-prose-storage-patch'
import {
  buildPendingPreparedStoryStateUpdate,
  PreparedStoryStateFailure,
  PreparedStoryStateUpdate,
} from '../../novel-writing/prepared-story-state'
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
  buildReferenceUsageReviewRecord,
} from '../../routes/novel-reference-service'
import {
  countProseChars,
} from '../../novel-writing/word-target'
import {
  asArray,
  getQualityGateDecision,
} from '../../routes/novel-route-utils'
import {
  buildPostCommitStoryStateSyncUpdate,
} from '../post-delivery/post-commit-sync-bundle'
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
  buildChapterAcceptancePrep,
} from './generate-chapter-acceptance-prep'
import {
  applyPostCommitAdmissionWarnings,
  createPostCommitWarningRunner,
  resolveReturnedAdmissionStatus,
  resyncChapterPlanAlignmentAfterProseStore,
} from './generate-chapter-post-commit'

export async function runFullProductionAdmissionAndStore(args: {
  activeWorkspace: string
  projectId: number
  project: any
  chapter: any
  chapters: any[]
  characters: any[]
  settings: any[]
  chapterSettingUsage: any[]
  finalText: string
  finalContinuityNotes: any
  finalSceneBreakdown: any
  ohStoryDeliveryReceipts: any
  postDraftDirector: any
  generatedTitlePatch: any
  selfCheck: any
  qualityLoop: any
  qualityLoopDiagnostics: any
  qualityGateProject: any
  qualityGateReview: any
  qualityWarningCandidates: ProseAdmissionWarning[]
  openingContinuityFailures: ProseAdmissionHardFailure[]
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
  prepareStoryStateUpdate: (...a: any[]) => any
  preferredModelId: any
  llmControlOptions: any
  stagedContextUsageReplacement: any
  stagedPreflightRepair: any
  contextPackage: any
  preStoreReceiptSyncContextPackage: any
  finalReviewContextPackage: any
  buildProseQualityReview: (...a: any[]) => any
  storeChapterProseMemory: (...a: any[]) => any
  mergeChapterRawPayload: (...a: any[]) => any
  editorRewrite: any
  memePolish: any
  humanizePostprocess?: any
  readabilityReview: any
  productionMode: string
  draftPromptDiagnostics: any
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
}) {
  const {
    activeWorkspace,
    projectId,
    project,
    chapter,
    chapters,
    characters,
    settings,
    chapterSettingUsage,
    finalText,
    finalContinuityNotes,
    finalSceneBreakdown,
    ohStoryDeliveryReceipts,
    postDraftDirector,
    generatedTitlePatch,
    selfCheck,
    qualityLoop,
    qualityLoopDiagnostics,
    qualityGateProject,
    qualityGateReview,
    qualityWarningCandidates,
    openingContinuityFailures,
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
    prepareStoryStateUpdate,
    preferredModelId,
    llmControlOptions,
    stagedContextUsageReplacement,
    stagedPreflightRepair,
    contextPackage,
    preStoreReceiptSyncContextPackage,
    finalReviewContextPackage,
    buildProseQualityReview,
    storeChapterProseMemory,
    mergeChapterRawPayload,
    editorRewrite,
    memePolish,
    humanizePostprocess = null,
    readabilityReview,
    productionMode,
    draftPromptDiagnostics,
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
  } = args

  qualityWarningCandidates.push(...collectStructuredReviewWarnings(qualityGateReview))
  const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)
  qualityWarningCandidates.push(
    ...asArray(preStoreQualityDecision?.hard_failures).map((failure: any) => proseAdmissionWarning('quality', failure?.key || 'quality_gate', failure?.message || failure?.evidence || failure?.key, failure)),
    ...asArray(preStoreQualityDecision?.advisory_failures).map((message: any) => proseAdmissionWarning('quality', 'quality_gate_advisory', message)),
    ...asArray(preStoreQualityDecision?.reasons).map((message: any) => proseAdmissionWarning('quality', 'quality_gate_reason', message)),
  )
  if (approvalRequired(approvalPolicy, 'low_score', approvals, { score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })) {
    qualityWarningCandidates.push(proseAdmissionWarning('quality', 'low_score_approval', '章节质检低于审批阈值。'))
  }
  if (approvalRequired(approvalPolicy, 'draft', approvals, { score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })) {
    qualityWarningCandidates.push(proseAdmissionWarning('review', 'draft_approval', '正文审批策略要求人工复核。'))
  }
  throwIfChapterGenerationAborted()
  const minimalValidation = validateMinimalChapterProse(finalText)
  const canonicalFailures: ProseAdmissionHardFailure[] = asArray(qualityLoop.decision?.hard_failures)
    .filter((failure: any) => failure?.source === 'deterministic' && failure?.key === 'canonical_proper_noun_conflict')
    .map((failure: any) => ({
      code: 'canonical_proper_noun_conflict',
      source: 'canonical_continuity' as const,
      message: failure?.message || '正文与高置信正史专名冲突。',
      details: failure,
    }))
  const resistanceAdmission = evaluateResistanceAdmission(finalText)
  const hardAdmission = classifyProseAdmission({
    hard_failures: [
      ...minimalValidation.failures,
      ...openingContinuityFailures,
      ...canonicalFailures,
      // System-wide: detector hard risks must never soft-pass into store.
      ...resistanceAdmission.hard_failures,
    ],
  })
  if (hardAdmission.hard_failures.length) {
    const primaryFailure = hardAdmission.hard_failures[0]
    const error = Object.assign(new Error(primaryFailure.message), {
      code: primaryFailure.code === 'opening_handoff_disconnected'
        ? 'PROSE_ADMISSION_BLOCKED_INVALID'
        : primaryFailure.source === 'canonical_continuity'
          ? 'PROSE_QUALITY_GATE_BLOCKED'
          : primaryFailure.source === 'detector_resistance'
            ? 'PROSE_RESISTANCE_GATE_BLOCKED'
            : 'PROSE_INVALID',
      quality_loop: qualityLoopDiagnostics,
      resistance_hard: primaryFailure.source === 'detector_resistance' ? primaryFailure : undefined,
    })
    throw markBlockedInvalidError(error, primaryFailure)
  }
  let referenceReport: any = { quality_assessment: { risk_level: 'unknown' }, unavailable: true }
  let safetyDecision: any = { blocked: false, score: null, copy_hit_count: 0, reasons: [] }
  let safetyExplanation: any = 'reference review unavailable'
  let migrationAudit: any = { passed: false, unavailable: true }
  try {
    referenceReport = await buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText, { persist: false })
    safetyDecision = getReferenceSafetyDecision(project, referenceReport)
    safetyExplanation = explainReferenceSafety(referenceReport, safetyDecision)
    migrationAudit = buildMigrationAudit(project, referenceReport, safetyExplanation)
    await storeGeneratedReviewRecord(buildReferenceUsageReviewRecord(project, referenceReport))
  } catch (error) {
    if (isAbortError(error)) throw error
    qualityWarningCandidates.push(proseAdmissionWarning('review', 'reference_review_unavailable', formatAdmissionError(error, 300)))
  }
  await onStage('safety', { status: safetyDecision.blocked ? 'failed' : 'success', score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
  const finalQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview, safetyDecision)
  if (safetyDecision.blocked) {
    const error = Object.assign(new Error('仿写安全阈值未通过'), { code: 'REFERENCE_SAFETY_BLOCKED', referenceReport, safetyDecision, safetyExplanation, migrationAudit })
    throw markBlockedInvalidError(error, {
      code: 'reference_safety_blocked',
      source: 'safety',
      message: '仿写安全阈值明确阻止正文入库。',
      details: { safety_decision: safetyDecision },
    })
  }
  qualityWarningCandidates.push(
    ...asArray(finalQualityDecision?.hard_failures).map((failure: any) => proseAdmissionWarning('quality', failure?.key || 'final_quality_gate', failure?.message || failure?.evidence || failure?.key, failure)),
    ...asArray(finalQualityDecision?.advisory_failures).map((message: any) => proseAdmissionWarning('quality', 'final_quality_advisory', message)),
  )
  const safetyApprovalRequired = approvalRequired(approvalPolicy, 'safety', approvals, { score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
  if (safetyApprovalRequired || String(referenceReport?.quality_assessment?.risk_level || '').toLowerCase() !== 'low' || asArray(safetyDecision?.reasons).length) {
    qualityWarningCandidates.push(proseAdmissionWarning('review', 'safety_review', safetyExplanation || '仿写安全报告需要复核。', { reference_report: referenceReport, safety_decision: safetyDecision }))
  }
  throwIfChapterGenerationAborted()
  await onStage('story_state', { status: 'running', phase: 'prepare' })
  let storyStateStatus: 'synced' | 'pending' = 'synced'
  let preparedStoryStateUpdate: PreparedStoryStateUpdate
  let storyStateWarning: any = null
  try {
    await runtime?.hooks?.beforeStoryState?.({ chapterId: chapter.id, finalText })
    preparedStoryStateUpdate = await prepareStoryStateUpdate(
      activeWorkspace,
      project,
      { ...chapter, chapter_text: finalText },
      finalReviewContextPackage,
      finalText,
      preferredModelId,
      llmControlOptions,
    )
    if (preparedStoryStateUpdate.hard_failures.length) {
      storyStateStatus = 'pending'
      storyStateWarning = { hard_failures: preparedStoryStateUpdate.hard_failures }
      preparedStoryStateUpdate = buildPendingPreparedStoryStateUpdate({
        reference_config: project.reference_config,
        failures: preparedStoryStateUpdate.hard_failures,
      })
    }
  } catch (error) {
    if (isAbortError(error)) throw error
    storyStateStatus = 'pending'
    const failures: PreparedStoryStateFailure[] = [{
      key: 'story_state_prepare_error',
      message: '故事状态准备失败，等待后续重试。',
      source: 'story_state',
    }]
    const storyStateErrorMessage = formatAdmissionError(error, 500)
    preparedStoryStateUpdate = buildPendingPreparedStoryStateUpdate({ reference_config: project.reference_config, failures, error: storyStateErrorMessage })
    storyStateWarning = { error: storyStateErrorMessage, hard_failures: failures }
  }
  if (storyStateStatus === 'pending') {
    for (const failure of preparedStoryStateUpdate.hard_failures) {
      qualityWarningCandidates.push(proseAdmissionWarning('story_state', failure.key, failure.message, failure.details))
    }
    await onStage('story_state', { status: 'warn', phase: 'pending', warning: storyStateWarning })
  }
  const precommitAdmission = classifyProseAdmission({ warnings: qualityWarningCandidates })
  const proseAdmission = {
    status: precommitAdmission.status as 'accepted' | 'accepted_with_warnings',
    quality_score: Number.isFinite(Number(selfCheck?.review?.score)) ? Number(selfCheck.review.score) : null,
    quality_warnings: precommitAdmission.warnings,
    story_state_status: storyStateStatus,
    story_state_warning: storyStateWarning,
  }
  await onStage('store', { status: 'running' })
  await runtime?.hooks?.beforeChapterStore?.({ chapterId: chapter.id, finalText })
  const chapterPatch = buildChapterProseStoragePatch({
    chapter,
    generatedTitlePatch,
    finalText,
    finalContinuityNotes,
    finalSceneBreakdown,
    ohStoryDeliveryReceipts,
    postDraftDirector,
    proseAdmission,
  })
  const acceptancePrep = buildChapterAcceptancePrep({
    projectId,
    project,
    chapter,
    chapterPatch,
    finalText,
    characters,
    chapters,
    settings,
    chapterSettingUsage,
    stagedContextUsageReplacement,
    stagedPreflightRepair,
    preparedStoryStateUpdate,
    storyStateStatus,
    contextPackage,
    selfCheck,
  })
  preparedStoryStateUpdate = acceptancePrep.preparedStoryStateUpdate
  const acceptanceCharacterCreates = acceptancePrep.acceptanceCharacterCreates
  const acceptanceCharacterUpdates = acceptancePrep.acceptanceCharacterUpdates
  const acceptanceSettingUpdates = acceptancePrep.acceptanceSettingUpdates
  const acceptanceUsageUpdates = acceptancePrep.acceptanceUsageUpdates
  const settingConsistencyReview = acceptancePrep.settingConsistencyReview
  throwIfChapterGenerationAborted()
  let acceptance: Awaited<ReturnType<typeof commitNovelChapterAcceptance>>
  try {
    acceptance = await commitNovelChapterAcceptance(activeWorkspace, {
      chapter_id: chapter.id,
      chapter_patch: chapterPatch,
      version_source: resolveChapterProseVersionSource({ revisionEligible: true, selfCheck, editorRewrite }),
      ...(storyStateStatus === 'synced' ? {
        next_reference_config: preparedStoryStateUpdate.next_reference_config,
        character_updates: acceptanceCharacterUpdates,
        setting_updates: acceptanceSettingUpdates,
        usage_updates: acceptanceUsageUpdates,
        worldbuilding_creates: asArray(stagedPreflightRepair?.staged_worldbuilding_creates),
        character_creates: acceptanceCharacterCreates,
        setting_creates: asArray(stagedPreflightRepair?.staged_setting_creates),
        chapter_setting_usage_replacement: stagedPreflightRepair?.staged_usage_replacement || stagedContextUsageReplacement || undefined,
      } : {}),
      reviews: [
        ...(storyStateStatus === 'synced' ? asArray(stagedPreflightRepair?.staged_reviews) : []),
        ...pendingGeneratedReviews,
        buildFingerprintScoreReviewRecord({
          projectId,
          chapterId: chapter.id,
          chapterNo: Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0) || 0,
          setId: resolveFingerprintContractInfo()?.set_id || BUILTIN_CONTRACT_SET.id,
          setLabel: BUILTIN_CONTRACT_SET.label,
          contractName: resistanceAdmission.report.contract_name,
          locked: Boolean(resolveFingerprintContractInfo()?.locked),
          contractScore: resistanceAdmission.report.contract_score,
          textChars: String(finalText || '').replace(/\s+/g, '').length,
          createdAt: new Date().toISOString(),
        }),
        buildProseQualityReview(precommitAdmission.status === 'accepted' ? 'ok' : 'warn', finalQualityDecision, '', {
          referenceReport,
          safetyDecision,
          migrationAudit,
          proseAdmission,
        }),
        settingConsistencyReview,
      ].filter(Boolean),
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw markBlockedInvalidError(error, {
      code: 'atomic_acceptance_failed',
      source: 'atomic',
      message: '章节原子验收失败，未写入任何业务数据。',
    })
  }
  let updated = acceptance.chapter
  const { warnings: postCommitWarnings, runPostCommitBestEffort } = createPostCommitWarningRunner(formatAdmissionError)
  await runPostCommitBestEffort('after_commit_hook', () => runtime?.hooks?.afterChapterCommit?.({ chapterId: chapter.id, finalText }))
  await runPostCommitBestEffort('store_stage', () => onStage('store', { status: 'success', word_count: countProseChars(finalText), scene_status: 'accepted' }))
  await runPostCommitBestEffort('progress_resync_next_chapters', async () => {
    updated = await resyncChapterPlanAlignmentAfterProseStore({
      activeWorkspace,
      projectId,
      chapter,
      chapterPatch,
      updated,
      source: 'post_prose_store',
      includeProjectAlign: true,
      projectAlignSource: 'post_prose_store_project_align',
    })
  })
  await runPostCommitBestEffort('memory', async () => {
    await storeChapterProseMemory(project, chapter.chapter_no, finalText)
  })
  await runPostCommitBestEffort('story_state_stage', () => onStage('story_state', storyStateStatus === 'synced'
    ? { status: 'success' }
    : { status: 'warn', phase: 'pending', warning: storyStateWarning }))
  let storyStateUpdateWithSync: any = preparedStoryStateUpdate.payload
  if (storyStateStatus === 'synced') await runPostCommitBestEffort('post_commit_sync', async () => {
    await runtime?.hooks?.beforePostCommitSync?.({ chapterId: chapter.id, finalText })
    const generationChapters = await listNovelChapters(activeWorkspace, projectId)
    storyStateUpdateWithSync = buildPostCommitStoryStateSyncUpdate({
      project,
      chapter: updated,
      contextPackage,
      chapterText: finalText,
      preStoreReceiptSyncContextPackage,
      finalReviewContextPackage,
      generationChapters,
      storyStateUpdate: preparedStoryStateUpdate.payload,
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
    })
  })
  const returnedAdmissionStatus = resolveReturnedAdmissionStatus(proseAdmission.status, postCommitWarnings)
  updated = await applyPostCommitAdmissionWarnings({
    warnings: postCommitWarnings,
    proseAdmission,
    returnedAdmissionStatus,
    mergeChapterRawPayload,
    activeWorkspace,
    chapterId: chapter.id,
    formatAdmissionError,
    chapterLike: updated,
  })
  return {
    chapter: updated,
    score: selfCheck?.review?.score ?? null,
    admission_status: returnedAdmissionStatus,
    quality_score: proseAdmission.quality_score,
    quality_warnings: proseAdmission.quality_warnings,
    story_state_status: storyStateStatus,
    story_state_warning: storyStateWarning,
    revised: Boolean(selfCheck?.revised),
    editor_rewrite: editorRewrite,
    meme_polish: memePolish,
    humanize_postprocess: humanizePostprocess,
    readability_review: readabilityReview,
    production_mode: productionMode,
    completed_stage: 'story_state',
    prompt_diagnostics: draftPromptDiagnostics,
    quality_loop: {
      rounds: qualityLoop.rounds.map((item: any) => ({ round: item.round, accepted: item.selection.accepted, reason: item.selection.reason })),
      decision: qualityLoop.decision,
    },
    post_draft_director: postDraftDirector,
    oh_story_delivery_receipts: ohStoryDeliveryReceipts,
    reference_report: referenceReport,
    safety_decision: safetyDecision,
    migration_audit: migrationAudit,
    story_state_update: storyStateUpdateWithSync,
    requires_next_chapter_quality_plan_receipts: nextChapterQualityPlanReceiptSync.requires_receipts,
    requires_status_filter_receipts: statusFilterReceiptSync.requires_receipts,
    config_snapshot: configSnapshot,
    post_commit_warnings: postCommitWarnings,
  }
}
