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
  applyR76PreStoreSanitize,
  buildR76HumanizeDefaultOptions,
  R76_ZHUQUE_STACK_VERSION,
} from '../../novel-writing/r76-zhuque-stack'
import {
  applyZhuqueFastPathOptions,
  isZhuqueFastProductionMode,
  ZHUQUE_FAST_PATH_VERSION,
} from '../../novel-writing/zhuque-fast-path'
import { ensureOpeningHandoffBridge, extractPrimaryEndingHooks } from '../../novel-writing/chapter-continuity-guard'
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
  runGenerateChapterContextAndSceneCards,
} from './generate-chapter-context-scene-cards'
import {
  runGenerateChapterDraftProse,
} from './generate-chapter-draft-prose'
import {
  runPostDraftEditorAndMemePolish,
} from './generate-chapter-editor-meme-polish'
import {
  runQualityLoopAndPrestoreSetup,
} from './generate-chapter-quality-prestore'
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

export function createGenerateChapterForGroupMethods(deps: {
  executeAgent: (...args: any[]) => any
  getProject: (...args: any[]) => any
  runtime?: any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  getApprovalPolicy: (...args: any[]) => any
  approvalRequired: (...args: any[]) => any
  buildAgentConfigSnapshot: (...args: any[]) => any
  buildApprovalError: (...args: any[]) => any
  buildMigrationAudit: (...args: any[]) => any
  buildReferenceUsageReport: (...args: any[]) => any
  explainReferenceSafety: (...args: any[]) => any
  getReferenceMigrationPlanForChapter: (...args: any[]) => any
  getReferenceSafetyDecision: (...args: any[]) => any
  generationSourceResolver: { resolve: (project: any, options?: any) => any }
  storeChapterProseMemory: (...args: any[]) => any
  mergeChapterRawPayload: (...args: any[]) => any
  buildChapterContextPackage: (...args: any[]) => any
  autoRepairChapterPreflightGaps: (...args: any[]) => any
  generateSceneCardsForChapter: (...args: any[]) => any
  ensureProseMeetsWordTarget: (...args: any[]) => any
  runCommercialEditorRewrite: (...args: any[]) => any
  runMemePolish: (...args: any[]) => any
  runReadabilityReview: (...args: any[]) => any
  runHumanizePostProcess: (...args: any[]) => any
  prepareStoryStateUpdate: (...args: any[]) => any
  trustedWordTargetContractionBudgets: WeakSet<object>
}) {
  const executeAgent = deps.executeAgent
  const getProject = deps.getProject
  const runtime = deps.runtime
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature
  const getApprovalPolicy = deps.getApprovalPolicy
  const approvalRequired = deps.approvalRequired
  const buildAgentConfigSnapshot = deps.buildAgentConfigSnapshot
  const buildApprovalError = deps.buildApprovalError
  const buildMigrationAudit = deps.buildMigrationAudit
  const buildReferenceUsageReport = deps.buildReferenceUsageReport
  const explainReferenceSafety = deps.explainReferenceSafety
  const getReferenceMigrationPlanForChapter = deps.getReferenceMigrationPlanForChapter
  const getReferenceSafetyDecision = deps.getReferenceSafetyDecision
  const generationSourceResolver = deps.generationSourceResolver
  const storeChapterProseMemory = deps.storeChapterProseMemory
  const mergeChapterRawPayload = deps.mergeChapterRawPayload
  const buildChapterContextPackage = deps.buildChapterContextPackage
  const autoRepairChapterPreflightGaps = deps.autoRepairChapterPreflightGaps
  const generateSceneCardsForChapter = deps.generateSceneCardsForChapter
  const ensureProseMeetsWordTarget = deps.ensureProseMeetsWordTarget
  const runCommercialEditorRewrite = deps.runCommercialEditorRewrite
  const runMemePolish = deps.runMemePolish
  const runReadabilityReview = deps.runReadabilityReview
  const runHumanizePostProcess = deps.runHumanizePostProcess
  const prepareStoryStateUpdate = deps.prepareStoryStateUpdate
  const trustedWordTargetContractionBudgets = deps.trustedWordTargetContractionBudgets

const generateChapterForGroup = async (activeWorkspace: string, projectId: number, chapterId: number, options: any = {}) => {
  const preferredModelId = Number(options.model_id || 0) || undefined
  const onStage = typeof options.onStage === 'function' ? options.onStage : async () => {}
  // Zhuque validation fast path: draft + sparse humanize + store (skip editor/multi-round review).
  // Must rebind BEFORE snapshotting llmControlOptions so expand:false reaches word-target repair.
  options = applyZhuqueFastPathOptions(options || {})
  const llmControlOptions = {
    abortSignal: options.abortSignal,
    llmTimeoutMs: options.llmTimeoutMs,
    signal: options.abortSignal,
    timeoutMs: options.llmTimeoutMs,
    // Allow callers to skip hard word-target expand (e.g. slow Claude proxy 524 on long rewrites).
    expand: options.expand,
    reviewLlmTimeoutMs: options.review_llm_timeout_ms || options.reviewLlmTimeoutMs,
    review_llm_timeout_ms: options.review_llm_timeout_ms || options.reviewLlmTimeoutMs,
    structuredReviewLlmTimeoutMs: options.structured_review_llm_timeout_ms || options.structuredReviewLlmTimeoutMs,
    structured_review_llm_timeout_ms: options.structured_review_llm_timeout_ms || options.structuredReviewLlmTimeoutMs,
    revisionLlmTimeoutMs: options.revision_llm_timeout_ms || options.revisionLlmTimeoutMs,
    revision_llm_timeout_ms: options.revision_llm_timeout_ms || options.revisionLlmTimeoutMs,
    wordTargetContractionBudget: { used: 0 },
  }
  trustedWordTargetContractionBudgets.add(llmControlOptions.wordTargetContractionBudget)
  const requestedQualityRepairTimeoutMs = Number(options.quality_repair_llm_timeout_ms || options.qualityRepairLlmTimeoutMs || 300000)
  const baseLlmTimeoutMs = Number(llmControlOptions.llmTimeoutMs || llmControlOptions.timeoutMs || 600000)
  const qualityRepairTimeoutMs = Math.max(30000, Math.min(
    Number.isFinite(baseLlmTimeoutMs) && baseLlmTimeoutMs > 0 ? baseLlmTimeoutMs : 600000,
    Number.isFinite(requestedQualityRepairTimeoutMs) && requestedQualityRepairTimeoutMs > 0 ? requestedQualityRepairTimeoutMs : 300000,
  ))
  const throwIfChapterGenerationAborted = () => throwIfAborted(llmControlOptions)
  throwIfAborted(options)
  const project = await getProject(activeWorkspace, projectId)
  if (!project) throw new Error('project not found')
  const configSnapshot = buildAgentConfigSnapshot(project, preferredModelId)
  const approvalPolicy = options.approval_policy || getApprovalPolicy(project)
  const approvals = options.approvals || {}
  const productionMode = String(options.production_mode || 'draft_review_revise_store')
  const isZhuqueFast = isZhuqueFastProductionMode(productionMode, options)
  const isSceneCardsOnly = productionMode === 'scene_cards_only'
  const isDraftOnly = productionMode === 'draft_only'
  const isDraftReviewOnly = productionMode === 'draft_review'
  // Fast path still uses full production store admission (not draft-mode ephemeral store).
  const isFullProduction = (!isSceneCardsOnly && !isDraftOnly && !isDraftReviewOnly) || isZhuqueFast
  const pendingGeneratedReviews: any[] = []
  const storeGeneratedReviewRecord = async (record: any) => {
    if (!record) return
    pendingGeneratedReviews.push(record)
  }
  let chapters = await listNovelChapters(activeWorkspace, projectId)
  let chapter = chapters.find(item => item.id === chapterId)
  if (!chapter) throw new Error('chapter not found')
  let [worldbuilding, characters, outlines, reviews, settings, chapterSettingUsage, projectSettingUsage] = await Promise.all([
    listNovelWorldbuilding(activeWorkspace, projectId),
    listNovelCharacters(activeWorkspace, projectId),
    listNovelOutlines(activeWorkspace, projectId),
    listNovelReviews(activeWorkspace, projectId),
    listNovelSettingEntities(activeWorkspace, projectId).catch(() => []),
    listNovelChapterSettingUsage(activeWorkspace, projectId, chapterId).catch(() => []),
    listNovelChapterSettingUsage(activeWorkspace, projectId).catch(() => []),
  ])
  const contextSceneResult = await runGenerateChapterContextAndSceneCards({
    activeWorkspace,
    projectId,
    project,
    chapter,
    chapters,
    worldbuilding,
    characters,
    outlines,
    reviews,
    settings,
    chapterSettingUsage,
    projectSettingUsage,
    options,
    preferredModelId,
    llmControlOptions,
    productionMode,
    isSceneCardsOnly,
    approvalPolicy,
    approvals,
    configSnapshot,
    runtime,
    buildChapterContextPackage,
    autoRepairChapterPreflightGaps,
    generateSceneCardsForChapter,
    approvalRequired,
    buildApprovalError,
    throwIfChapterGenerationAborted,
    onStage,
  })
  if (contextSceneResult.earlyReturn) {
    return contextSceneResult.earlyReturn
  }
  chapter = contextSceneResult.chapter
  chapters = contextSceneResult.chapters
  chapterSettingUsage = contextSceneResult.chapterSettingUsage
  projectSettingUsage = contextSceneResult.projectSettingUsage
  const wordTarget = contextSceneResult.wordTarget
  const stagedContextUsageReplacement = contextSceneResult.stagedContextUsageReplacement
  const stagedPreflightRepair = contextSceneResult.stagedPreflightRepair
  let contextPackage = contextSceneResult.contextPackage
  let generationContract = contextSceneResult.generationContract
  const strictPreflightReadiness = contextSceneResult.strictPreflightReadiness

  const configuredQualityThreshold = [
    options.quality_threshold,
    options.qualityThreshold,
    project?.reference_config?.quality_gate?.min_score,
    project?.reference_config?.quality_gate?.minScore,
    78,
  ]
    .map(value => Number(value))
    .find(value => Number.isFinite(value) && value > 0) || 78
  const qualityThreshold = resolveEffectiveQualityThreshold(configuredQualityThreshold, contextPackage)
  const qualityGateProject = qualityThreshold > 0
    ? {
        ...project,
        reference_config: {
          ...(project.reference_config || {}),
          quality_gate: {
            ...(project.reference_config?.quality_gate || {}),
            min_score: qualityThreshold,
          },
          approval_policy: {
            ...(project.reference_config?.approval_policy || {}),
            low_score_threshold: qualityThreshold,
          },
        },
      }
    : project

  const draftResultBundle = await runGenerateChapterDraftProse({
    activeWorkspace,
    project,
    chapter,
    chapters,
    worldbuilding,
    characters,
    outlines,
    contextPackage,
    generationContract,
    wordTarget,
    preferredModelId,
    options,
    getStageModelId,
    generationSourceResolver,
    getReferenceMigrationPlanForChapter,
    throwIfChapterGenerationAborted,
    onStage,
  })
  let generationLease: Awaited<ReturnType<typeof runGenerateChapterDraftProse>>['generationLease']
  try {
  generationLease = draftResultBundle.generationLease
  let finalText = draftResultBundle.finalText
  let finalSceneBreakdown = draftResultBundle.finalSceneBreakdown
  let finalContinuityNotes = draftResultBundle.finalContinuityNotes
  let ohStoryDeliveryReceipts = draftResultBundle.ohStoryDeliveryReceipts
  const generatedTitlePatch = draftResultBundle.generatedTitlePatch
  const draftPromptDiagnostics = draftResultBundle.draftPromptDiagnostics
  let editorRewrite = draftResultBundle.editorRewrite
  let memePolish = draftResultBundle.memePolish
  let readabilityReview = draftResultBundle.readabilityReview
  const editorMemeResult = await runPostDraftEditorAndMemePolish({
    isDraftOnly: isDraftOnly || isZhuqueFast,
    activeWorkspace,
    project,
    contextPackage,
    finalText,
    finalSceneBreakdown,
    finalContinuityNotes,
    editorRewrite,
    memePolish,
    wordTarget,
    preferredModelId,
    llmControlOptions,
    ensureProseMeetsWordTarget,
    runCommercialEditorRewrite,
    runMemePolish,
    throwIfChapterGenerationAborted,
    onStage,
  })
  finalText = editorMemeResult.finalText
  finalSceneBreakdown = editorMemeResult.finalSceneBreakdown
  finalContinuityNotes = editorMemeResult.finalContinuityNotes
  editorRewrite = editorMemeResult.editorRewrite
  memePolish = editorMemeResult.memePolish
  let qualityWarningCandidates = editorMemeResult.qualityWarningCandidates
  const wordTargetExpansionPatches = editorMemeResult.wordTargetExpansionPatches
  const wordTargetCompatibility = editorMemeResult.wordTargetCompatibility
  const qualityPrestoreResult = await runQualityLoopAndPrestoreSetup({
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
    isZhuqueFast,
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
  })
  finalText = qualityPrestoreResult.finalText
  finalSceneBreakdown = qualityPrestoreResult.finalSceneBreakdown
  finalContinuityNotes = qualityPrestoreResult.finalContinuityNotes
  const qualityLoop = qualityPrestoreResult.qualityLoop
  const qualityLoopDiagnostics = qualityPrestoreResult.qualityLoopDiagnostics
  qualityWarningCandidates = qualityPrestoreResult.qualityWarningCandidates
  let selfCheck = qualityPrestoreResult.selfCheck
  readabilityReview = qualityPrestoreResult.readabilityReview
  let proseRevisionReceiptSync = qualityPrestoreResult.proseRevisionReceiptSync
  let deslopRepairReceiptSync = qualityPrestoreResult.deslopRepairReceiptSync
  let qualityAuditRepairReceiptSync = qualityPrestoreResult.qualityAuditRepairReceiptSync
  let revisionContextReceiptSync = qualityPrestoreResult.revisionContextReceiptSync
  let revisionCascadeImpactSync = qualityPrestoreResult.revisionCascadeImpactSync
  let revisionScopeGuardSync = qualityPrestoreResult.revisionScopeGuardSync
  const deterministicProseCleanup = qualityPrestoreResult.deterministicProseCleanup
  const formatNormalization = qualityPrestoreResult.formatNormalization
  const punctuationNormalization = qualityPrestoreResult.punctuationNormalization
  const deslopTermNormalization = qualityPrestoreResult.deslopTermNormalization
  const cleanupRepairFormatNormalization = qualityPrestoreResult.cleanupRepairFormatNormalization
  const cleanupRepairPunctuationNormalization = qualityPrestoreResult.cleanupRepairPunctuationNormalization
  const cleanupRepairDeslopTermNormalization = qualityPrestoreResult.cleanupRepairDeslopTermNormalization
  let qualityGateReview = qualityPrestoreResult.qualityGateReview
  const finalReviewContextPackage = qualityPrestoreResult.finalReviewContextPackage
  const nextChapterQualityPlanReceiptSync = qualityPrestoreResult.nextChapterQualityPlanReceiptSync
  const statusFilterReceiptSync = qualityPrestoreResult.statusFilterReceiptSync
  const writePreparationReceiptSync = qualityPrestoreResult.writePreparationReceiptSync
  const preStoreReceiptSyncContextPackage = qualityPrestoreResult.preStoreReceiptSyncContextPackage
  const postDraftDirector = qualityPrestoreResult.postDraftDirector
  const draftQualityDecision = qualityPrestoreResult.draftQualityDecision
  const buildProseQualityReview = qualityPrestoreResult.buildProseQualityReview

  // R76 Zhuque stack default: risk_segment humanize + pre-store stock sanitize (not chapter-tuned).
  await onStage('humanize_postprocess', {
    status: 'running',
    version: 'humanize_postprocess_v3',
    r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
  })
  let humanizePostprocess: any = null
  try {
    const humanizeResult = await runHumanizePostProcess(
      activeWorkspace,
      project,
      contextPackage,
      finalText,
      preferredModelId,
      buildR76HumanizeDefaultOptions({
        ...llmControlOptions,
        skip_humanize_postprocess: options.skip_humanize_postprocess ?? options.skipHumanizePostprocess,
        skipHumanizePostprocess: options.skip_humanize_postprocess ?? options.skipHumanizePostprocess,
        enable_humanize_postprocess: options.enable_humanize_postprocess ?? options.enableHumanizePostprocess,
        enableHumanizePostprocess: options.enable_humanize_postprocess ?? options.enableHumanizePostprocess,
      }),
    )
    finalText = String(humanizeResult?.final_text || finalText)
    humanizePostprocess = humanizeResult?.report || null
    if (humanizePostprocess && typeof humanizePostprocess === 'object') {
      humanizePostprocess = {
        ...humanizePostprocess,
        r76_zhuque_stack: humanizePostprocess.r76_zhuque_stack || R76_ZHUQUE_STACK_VERSION,
      }
    }
    await onStage('humanize_postprocess', {
      status: humanizePostprocess?.skipped ? 'skipped' : (humanizePostprocess?.accepted ? 'success' : 'warn'),
      report: humanizePostprocess,
      chars: (finalText || '').length,
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    })
  } catch (error: any) {
    humanizePostprocess = {
      version: 'humanize_postprocess_v3',
      enabled: true,
      accepted: false,
      skipped: false,
      reason: 'humanize_postprocess_failed',
      error: String(error?.message || error || 'unknown').slice(0, 240),
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    }
    await onStage('humanize_postprocess', {
      status: 'failed',
      report: humanizePostprocess,
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    })
    // Non-blocking: keep quality-loop text if postprocess throws.
  }
  // Always apply R76 pre-store sanitize (even if humanize skipped/failed).
  finalText = applyR76PreStoreSanitize(finalText, {
    project,
    contextPackage,
    characters,
    skip_mid_monologue_densify: options.skip_mid_monologue_densify === true || options.skipMidMonologueDensify === true || isZhuqueFast,
    skipMidMonologueDensify: options.skip_mid_monologue_densify === true || options.skipMidMonologueDensify === true || isZhuqueFast,
  })

  // System-level opening handoff bridge: if draft misses hard primary ending hook, prepend a short bridge.
  // This keeps continuity admission honest while preventing flaky model openings from hard-blocking every chapter.
  {
    const handoffContext = enrichContextWithProgressResync(enrichContextWithStrongHandoff(contextPackage))
    const previousChapter = (
      handoffContext?.continuity?.previous_chapter
      || handoffContext?.continuity?.previousChapter
      || contextPackage?.continuity?.previous_chapter
      || contextPackage?.continuity?.previousChapter
      || contextPackage?.previous_chapter
      || contextPackage?.previousChapter
      || null
    )
    const bridge = ensureOpeningHandoffBridge(finalText, previousChapter)
    if (bridge.bridged) {
      finalText = applyR76PreStoreSanitize(bridge.text, {
        project,
        contextPackage,
        characters,
        skip_mid_monologue_densify: options.skip_mid_monologue_densify === true || options.skipMidMonologueDensify === true || isZhuqueFast,
        skipMidMonologueDensify: options.skip_mid_monologue_densify === true || options.skipMidMonologueDensify === true || isZhuqueFast,
      })
      await onStage('opening_handoff_bridge', {
        status: 'success',
        reason: bridge.reason,
        bridge: bridge.bridge || '',
        primary_hooks: extractPrimaryEndingHooks(previousChapter).map((item: any) => item.key),
      })
    }
  }

  await storePreStoreReceiptSyncReviews({
    storeGeneratedReviewRecord,
    projectId,
    chapter,
    selfCheck,
    proseRevisionReceiptSync,
    deslopRepairReceiptSync,
    qualityAuditRepairReceiptSync,
    revisionCascadeImpactSync,
    revisionScopeGuardSync,
    deterministicProseCleanup,
    formatNormalization,
    punctuationNormalization,
    deslopTermNormalization,
    cleanupRepairFormatNormalization,
    cleanupRepairPunctuationNormalization,
    cleanupRepairDeslopTermNormalization,
  })
  const openingContinuityAssessment = assessInitialProseOpeningContinuity(finalText, enrichContextWithProgressResync(enrichContextWithStrongHandoff(contextPackage)))
  const openingContinuityFailures: ProseAdmissionHardFailure[] = openingContinuityAssessment.failure
    ? [openingContinuityAssessment.failure]
    : []
  if ((isDraftOnly || isDraftReviewOnly) && !isZhuqueFast) {
    return await runDraftModeAdmissionAndStore({
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
      humanizePostprocess,
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
    })
  }
  return await runFullProductionAdmissionAndStore({
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
    humanizePostprocess,
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
  })
  } finally {
    await generationLease?.release()
  }

}

  return {
    generateChapterForGroup,
  }
}
