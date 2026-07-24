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
  evaluateHumanWebnovelResistance,
  isStoreBlockingPureAiResistanceKey,
} from '../../novel-writing/human-webnovel-resistance'
import {
  applyR76PreStoreSanitize,
} from '../../novel-writing/r76-zhuque-stack'
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

export async function runQualityLoopPhase(args: {
  options: any
  project: any
  chapter: any
  projectId: number
  activeWorkspace: string
  preferredModelId: any
  llmControlOptions: any
  qualityRepairTimeoutMs: number
  qualityThreshold: number
  isDraftOnly: boolean
  isDraftReviewOnly: boolean
  generationContract: any
  contextPackage: any
  wordTarget: any
  wordTargetCompatibility: any
  wordTargetExpansionPatches: any[]
  finalText: string
  finalSceneBreakdown: any
  finalContinuityNotes: any
  ohStoryDeliveryReceipts: any
  qualityWarningCandidates: any[]
  editorRewrite: any
  memePolish: any
  readabilityReview: any
  draftPromptDiagnostics: any
  productionMode: any
  configSnapshot: any
  qualityGateProject: any
  executeAgent: (...a: any[]) => any
  getStageModelId: (...a: any[]) => any
  runReadabilityReview: (...a: any[]) => any
  throwIfChapterGenerationAborted: () => void
  onStage: (...a: any[]) => any
}): Promise<Record<string, any>> {
  let {
    options,
    project,
    chapter,
    projectId,
    activeWorkspace,
    preferredModelId,
    llmControlOptions,
    qualityRepairTimeoutMs,
    qualityThreshold,
    isDraftOnly,
    isDraftReviewOnly,
    generationContract,
    contextPackage,
    wordTarget,
    wordTargetCompatibility,
    wordTargetExpansionPatches,
    finalText,
    finalSceneBreakdown,
    finalContinuityNotes,
    ohStoryDeliveryReceipts,
    qualityWarningCandidates,
    editorRewrite,
    memePolish,
    readabilityReview,
    draftPromptDiagnostics,
    productionMode,
    configSnapshot,
    qualityGateProject,
    executeAgent,
    getStageModelId,
    runReadabilityReview,
    throwIfChapterGenerationAborted,
    onStage,
  } = args

throwIfChapterGenerationAborted()
await onStage('review', { status: 'running' })
finalText = applyR76PreStoreSanitize(normalizeProseForStorage(finalText))
// System-wide detector resistance: even draft_only gets one minimal revise when pure-AI hard classes hit.
// This is not chapter-specific tuning; full quality revise still stays off for pure draft modes when clean.
const resistanceProbe = evaluateHumanWebnovelResistance(finalText)
const resistanceHardCount = Array.isArray(resistanceProbe?.hard_failures) ? resistanceProbe.hard_failures.length : 0
const resistanceNeedsRevise = resistanceHardCount > 0
// R24 lesson: inventory/clinical/symmetry hard fails often need >1 revise; do not stop at one warn/skip.
// Hard detector risks get revision attempts; store still blocks if residual hard remains.
// Claude/cliproxy long revise streams often hang or truncate — prefer fewer rounds + residual sanitize.
const explicitRevisionCap = Number((options as any)?.max_quality_revision_rounds)
const defaultDraftRounds = resistanceNeedsRevise ? 3 : 0
const defaultFullRounds = resistanceNeedsRevise ? 3 : 2
const qualityRevisionRounds = Number.isFinite(explicitRevisionCap)
  ? Math.max(0, Math.min(5, Math.floor(explicitRevisionCap)))
  : ((isDraftReviewOnly || isDraftOnly) ? defaultDraftRounds : defaultFullRounds)
let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>
try {
  qualityLoop = await runProseQualityLoop({
    initialText: finalText,
    minScore: qualityThreshold,
    coreContract: buildFocusedQualityCoreContract(generationContract),
    continuityContext: contextPackage,
    maxRevisionRounds: qualityRevisionRounds,
    scan: text => scanProseForQualityLoop(text, contextPackage, wordTarget, wordTargetCompatibility ? {
      word_target_compatibility_pass: true,
      compatibility_ceiling: wordTargetCompatibility.compatibility_ceiling,
    } : {}),
    review: async ({ prompt, round, attempt }) => {
      throwIfChapterGenerationAborted()
      await onStage('review', { status: 'running', phase: round > 0 ? 'quality_recheck' : 'quality_review', round, attempt })
      const reviewPrompt = attempt > 1
        ? `${prompt}\n上一次审查没有返回可用的完整六维 JSON。本次必须完整输出 score、score_scale=\"0-100\"、六个 dimensions 和 findings，不得省略或截断。`
        : prompt
      const result = await executeAgent('review-agent', project, { task: reviewPrompt }, {
        activeWorkspace,
        modelId: String(getStageModelId(project, 'review', preferredModelId) || ''),
        maxTokens: proseQualityReviewMaxTokensForAttempt(attempt),
        temperature: 0.15,
        skipMemory: true,
        signal: options.abortSignal,
        timeoutMs: qualityRepairTimeoutMs,
      })
      if ((result as any)?.error) {
        throw Object.assign(new Error(String((result as any).error)), {
          code: round > 0 ? 'PROSE_QUALITY_RECHECK_UNAVAILABLE' : 'PROSE_REVIEW_FAILED',
          llm_diagnostics: buildLLMResultDiagnostics(result),
        })
      }
      const payload = getNovelPayload(result)
      const diagnostics = buildLLMResultDiagnostics(result)
      return {
        ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
        __quality_review_transport: sanitizeProseQualityReviewTransport({
          finish_reason: diagnostics.finish_reason,
          usage: diagnostics.usage,
          content_length: diagnostics.content_length,
        }),
      }
    },
    revise: async ({ prompt, round }) => {
      throwIfChapterGenerationAborted()
      await onStage('revise', { status: 'running', phase: 'quality_revision', round })
      // Flash/Gemini: full-chapter revise often hits output ceiling; give extra headroom vs draft.
      const reviseMaxTokens = Math.min(48000, Math.max(24000, proseMaxTokensForWordTarget(wordTarget) + 6000))
      const result = await executeAgent('prose-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId: String(getStageModelId(project, 'review', preferredModelId) || ''),
        maxTokens: reviseMaxTokens,
        temperature: 0.25,
        skipMemory: true,
        signal: options.abortSignal,
        timeoutMs: qualityRepairTimeoutMs,
      })
      try {
        assertCompleteProseTransportResult(result, 'PROSE_REVISION_TRUNCATED')
      } catch (error: any) {
        // System-wide: truncated revise must not kill whole chapter generation.
        // Return unusable payload so quality loop keeps pre-revision text, then residual sanitize + hard admission still run.
        if (String(error?.code || '') === 'PROSE_REVISION_TRUNCATED') {
          await onStage('revise', {
            status: 'warn',
            phase: 'quality_revision_truncated_fallback',
            round,
            detail: '修订输出截断，本轮跳过，保留修订前正文并继续抗检测清洗/入库门禁',
          })
          return {
            final_text: '',
            revision_truncated: true,
            revision_receipts: [{ key: 'revision_truncated_fallback', changed_evidence: 'kept_pre_revision_text' }],
          }
        }
        throw error
      }
      if ((result as any)?.error) {
        throw Object.assign(new Error(String((result as any).error)), {
          code: 'PROSE_REVISION_FAILED',
          llm_diagnostics: buildLLMResultDiagnostics(result),
        })
      }
      const payload = getNovelPayload(result)
      const revised = asArray(payload?.prose_chapters || payload?.proseChapters)[0] || payload
      const revisedText = revised?.chapter_text
        || revised?.chapterText
        || payload?.chapter_text
        || payload?.chapterText
        || extractPlainProseFallback(result, 800)
      return {
        ...payload,
        ...revised,
        final_text: normalizeProseForStorage(revisedText),
      }
    },
  })
} catch (error: any) {
  throw attachQualityLoopFailureDiagnostics(error, { draftPromptDiagnostics, qualityThreshold })
}
finalText = applyR76PreStoreSanitize(String(qualityLoop.final_text || ''))
// Re-scan after sanitize; residual hard risks stay on decision for admission/store block.
{
  const residual = evaluateHumanWebnovelResistance(finalText)
  // Store-blocking residual: pure-AI families only. Positive fingerprint / texture soft-gates
  // stay as revise targets and warnings while Zhuque pass is being validated first.
  const residualHard = (Array.isArray(residual?.hard_failures) ? residual.hard_failures : [])
    .filter((item: any) => isStoreBlockingPureAiResistanceKey(String(item?.key || '')))
  if (residualHard.length) {
    const existing = Array.isArray(qualityLoop?.decision?.hard_failures) ? qualityLoop.decision.hard_failures : []
    const mapped = residualHard.map((item: any) => ({
      key: String(item?.key || 'hw_resistance'),
      message: String(item?.evidence || item?.fix || item?.label || item?.key || '抗检测硬门禁未清除'),
      source: 'deterministic' as const,
    }))
    const keys = new Set(existing.map((item: any) => String(item?.key || '')))
    qualityLoop.decision = {
      ...(qualityLoop.decision || {}),
      passed: false,
      approvable: false,
      hard_failures: [
        ...existing,
        ...mapped.filter((item: any) => !keys.has(String(item.key || ''))),
      ],
    }
  }
}
const qualityLoopDiagnostics = {
  rounds: qualityLoop.rounds.map((item: any) => ({
    round: item.round,
    accepted: item.selection.accepted,
    reason: item.selection.reason,
  })),
  decision: qualityLoop.decision,
}
qualityWarningCandidates.push(
  ...asArray(qualityLoop.decision?.advisory_failures).map((message: any) => proseAdmissionWarning('quality', 'quality_advisory', message)),
  ...asArray(qualityLoop.decision?.hard_failures).map((failure: any) => proseAdmissionWarning(
    'quality',
    failure?.key || 'quality_failure',
    failure?.message || failure?.evidence || failure?.key || '质量诊断未通过',
    failure,
  )),
)
if (qualityLoop.quality_warning) qualityWarningCandidates.push(qualityLoop.quality_warning)
let selfCheck = buildLegacyCompatibleSelfCheck(qualityLoop)
if (!(selfCheck.review as any).next_chapter_quality_plan) {
  ;(selfCheck.review as any).next_chapter_quality_plan = buildFallbackNextChapterQualityPlan(
    selfCheck.review,
    contextPackage,
    finalText,
  )
}
ohStoryDeliveryReceipts = {
  ...(ohStoryDeliveryReceipts || {}),
  revision_receipts: [
    ...asArray(ohStoryDeliveryReceipts?.revision_receipts),
    ...qualityLoop.rounds
      .filter((item: any) => item?.selection?.accepted)
      .flatMap((item: any) => asArray(item?.revision?.revision_receipts || item?.revision?.revisionReceipts)),
  ],
}
const initialReviewDecision = getQualityGateDecision(qualityGateProject, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck.revised) })
await onStage('review', { status: initialReviewDecision.passed ? 'success' : 'warn', score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [], quality_gate: initialReviewDecision, scene_status: 'reviewed' })
const revisionStageStatus = selfCheck.revised ? 'success' : selfCheck?.revision?.error ? 'warn' : 'skipped'
await onStage('revise', {
  status: revisionStageStatus,
  revised: Boolean(selfCheck.revised),
  revision_error: selfCheck?.revision?.error || '',
  llm_diagnostics: selfCheck?.revision?.llm_diagnostics,
  scene_status: selfCheck.revised ? 'revised' : '',
})
if (selfCheck.revised && selfCheck.revision) {
  finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, selfCheck.revision.scene_breakdown, finalText)
  finalContinuityNotes = selfCheck.revision.continuity_notes?.length ? selfCheck.revision.continuity_notes : finalContinuityNotes
}

  return {
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
    qualityRepairTimeoutMs,
    qualityThreshold,
    qualityWarningCandidates,
    readabilityReview,
    revisionStageStatus,
    runReadabilityReview,
    selfCheck,
    throwIfChapterGenerationAborted,
    wordTarget,
    wordTargetCompatibility,
    wordTargetExpansionPatches,
  }
}
