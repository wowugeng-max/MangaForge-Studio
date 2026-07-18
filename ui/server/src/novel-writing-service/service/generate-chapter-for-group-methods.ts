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
  generateNovelChapterProse: (...args: any[]) => any
  storeChapterProseMemory: (...args: any[]) => any
  mergeChapterRawPayload: (...args: any[]) => any
  buildChapterContextPackage: (...args: any[]) => any
  autoRepairChapterPreflightGaps: (...args: any[]) => any
  generateSceneCardsForChapter: (...args: any[]) => any
  ensureProseMeetsWordTarget: (...args: any[]) => any
  runCommercialEditorRewrite: (...args: any[]) => any
  runMemePolish: (...args: any[]) => any
  runReadabilityReview: (...args: any[]) => any
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
  const generateNovelChapterProse = deps.generateNovelChapterProse
  const storeChapterProseMemory = deps.storeChapterProseMemory
  const mergeChapterRawPayload = deps.mergeChapterRawPayload
  const buildChapterContextPackage = deps.buildChapterContextPackage
  const autoRepairChapterPreflightGaps = deps.autoRepairChapterPreflightGaps
  const generateSceneCardsForChapter = deps.generateSceneCardsForChapter
  const ensureProseMeetsWordTarget = deps.ensureProseMeetsWordTarget
  const runCommercialEditorRewrite = deps.runCommercialEditorRewrite
  const runMemePolish = deps.runMemePolish
  const runReadabilityReview = deps.runReadabilityReview
  const prepareStoryStateUpdate = deps.prepareStoryStateUpdate
  const trustedWordTargetContractionBudgets = deps.trustedWordTargetContractionBudgets

const generateChapterForGroup = async (activeWorkspace: string, projectId: number, chapterId: number, options: any = {}) => {
  const preferredModelId = Number(options.model_id || 0) || undefined
  const onStage = typeof options.onStage === 'function' ? options.onStage : async () => {}
  const llmControlOptions = {
    abortSignal: options.abortSignal,
    llmTimeoutMs: options.llmTimeoutMs,
    signal: options.abortSignal,
    timeoutMs: options.llmTimeoutMs,
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
  const isSceneCardsOnly = productionMode === 'scene_cards_only'
  const isDraftOnly = productionMode === 'draft_only'
  const isDraftReviewOnly = productionMode === 'draft_review'
  const isFullProduction = !isSceneCardsOnly && !isDraftOnly && !isDraftReviewOnly
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
  const buildGenerationContext = async () => runtime?.buildChapterContext
    ? runtime.buildChapterContext({
        workspace: activeWorkspace,
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
      })
    : buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews, {
        settingEntities: settings,
        chapterSettingUsage,
        projectSettingUsage,
        persistSettingUsage: false,
      })
  let wordTarget = resolveChapterWordTarget(project, chapter, options)
  const initialContextPackage = applyChapterWordTargetToContext(
    await buildGenerationContext(),
    wordTarget,
  )
  let stagedContextUsageReplacement = initialContextPackage?.setting_context?.auto_matched
    ? asArray(initialContextPackage?.setting_context?.chapter_usage)
    : null
  if (stagedContextUsageReplacement) {
    chapterSettingUsage = stagedContextUsageReplacement
    projectSettingUsage = [
      ...projectSettingUsage.filter((usage: any) => Number(usage?.chapter_id || 0) !== chapter.id),
      ...chapterSettingUsage,
    ]
  }
  let preparedGeneration = prepareProseGenerationContract(initialContextPackage, options)
  let contextPackage = preparedGeneration.contextPackage
  let generationContract = preparedGeneration.contract
  let strictPreflightReadiness = resolveStrictPreflightReadiness(contextPackage.preflight)
  let stagedPreflightRepair: any = null
  const enforcePreparedGate = async (requireSceneCards: boolean) => {
    try {
      await preparedGeneration.runAfterGate(async () => undefined, requireSceneCards)
    } catch (error: any) {
      await onStage(requireSceneCards ? 'scene_cards' : 'context', {
        status: 'failed',
        code: error?.code,
        reasons: error?.gateDecision?.reasons || [],
        gate_decision: error?.gateDecision,
      })
      throw error
    }
  }
  const contextPreflightReady = contextPackage.preflight.ready === true && strictPreflightReadiness.ready
  await onStage('context', {
    status: contextPreflightReady ? 'success' : 'failed',
    score: contextPreflightReady ? 100 : 0,
    warnings: contextPackage.preflight.warnings || [],
    blockers: contextPackage.preflight.blockers || [],
    director_readiness: generationContract.director?.readiness,
  })
  const preflightNeedsMaterialRepair = contextPackage.preflight.ready !== true || !strictPreflightReadiness.ready
  if (preflightNeedsMaterialRepair && options.auto_repair_missing_material === true) {
    await onStage('material_repair', { status: 'running', warnings: contextPackage.preflight.warnings || [], blockers: contextPackage.preflight.blockers || [] })
    const repairResult = await autoRepairChapterPreflightGaps(activeWorkspace, project, chapter, contextPackage, preferredModelId, { ...llmControlOptions, persist: false })
    stagedPreflightRepair = repairResult
    chapter = repairResult.chapter || chapter
    chapters = chapters.map(item => item.id === chapterId ? chapter : item)
    worldbuilding = repairResult.worldbuilding || worldbuilding
    characters = repairResult.characters || characters
    settings = repairResult.settings || settings
    chapterSettingUsage = repairResult.staged_usage_replacement || chapterSettingUsage
    projectSettingUsage = [
      ...projectSettingUsage.filter((usage: any) => Number(usage?.chapter_id || 0) !== chapter.id),
      ...chapterSettingUsage,
    ]
    reviews = [...reviews, ...asArray(repairResult.staged_reviews)]
    wordTarget = resolveChapterWordTarget(project, chapter, options)
    const repairedContextPackage = applyChapterWordTargetToContext(
      runtime?.buildChapterContext ? await buildGenerationContext() : repairResult.context_package,
      wordTarget,
    )
    const repairedWritePrep = repairedContextPackage?.chapter_target?.write_preparation_brief
      || repairedContextPackage?.chapter_target?.writePreparationBrief
      || repairedContextPackage?.pre_draft_brief?.write_preparation_brief
      || repairedContextPackage?.write_preparation_brief
    const repairedWritePrepReady = ['ready', 'ok', 'pass'].includes(String(
      repairedWritePrep?.readiness_status
      || repairedWritePrep?.readinessStatus
      || '',
    ).toLowerCase())
    const postRepairOptions = repairedWritePrepReady
      ? {
          ...(options || {}),
          // Drop stale cockpit launch-gate snapshots after local material repair succeeded.
          chapter_launch_gate: undefined,
          chapterLaunchGate: undefined,
        }
      : options
    preparedGeneration = prepareProseGenerationContract(repairedContextPackage, postRepairOptions)
    contextPackage = preparedGeneration.contextPackage
    if (contextPackage?.setting_context?.auto_matched) stagedContextUsageReplacement = asArray(contextPackage.setting_context.chapter_usage)
    generationContract = preparedGeneration.contract
    strictPreflightReadiness = resolveStrictPreflightReadiness(contextPackage.preflight)
    await onStage('material_repair', {
      status: contextPackage.preflight.ready === true && strictPreflightReadiness.ready ? 'success' : 'warn',
      repaired: repairResult.repaired,
      errors: repairResult.errors,
      remaining_warnings: contextPackage.preflight.warnings || [],
      remaining_blockers: contextPackage.preflight.blockers || [],
    })
  }
  await enforcePreparedGate(false)
  throwIfChapterGenerationAborted()
  await onStage('scene_cards', { status: 'running' })
  let generatedSceneCardsThisRun = false
  if (!generationContract.chapter.scene_cards.length || options.force_scene_cards === true) {
    const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, contextPackage, preferredModelId, llmControlOptions)
    if (sceneResult.sceneCards.length > 0) {
      generatedSceneCardsThisRun = true
      // Re-align strong handoff onto newly generated scene cards before any persist/use.
      const alignedSceneContext = enrichContextWithStrongHandoff({
        ...contextPackage,
        chapter_target: {
          ...(contextPackage?.chapter_target || {}),
          scene_cards: sceneResult.sceneCards,
          sceneCards: sceneResult.sceneCards,
        },
        ...(contextPackage?.chapterTarget ? {
          chapterTarget: {
            ...contextPackage.chapterTarget,
            scene_cards: sceneResult.sceneCards,
            sceneCards: sceneResult.sceneCards,
          },
        } : {}),
      })
      const alignedSceneCards = asArray(alignedSceneContext?.chapter_target?.scene_cards || sceneResult.sceneCards)
      const sceneChapterPatch = {
        scene_breakdown: alignedSceneCards,
        scene_list: alignedSceneCards,
        raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'chapter_group' },
      }
      if (isSceneCardsOnly) {
        const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, sceneChapterPatch as any, { createVersion: false })
        if (updatedSceneChapter) chapter = updatedSceneChapter
        chapters = await listNovelChapters(activeWorkspace, projectId)
      } else {
        chapter = { ...chapter, ...sceneChapterPatch }
        chapters = chapters.map(item => item.id === chapter.id ? chapter : item)
      }
      wordTarget = resolveChapterWordTarget(project, chapter, options)
      const sceneContextPackage = applyChapterWordTargetToContext(
        {
          ...alignedSceneContext,
          chapter_target: {
            ...(alignedSceneContext?.chapter_target || {}),
            scene_cards: alignedSceneCards,
            sceneCards: alignedSceneCards,
          },
          ...(alignedSceneContext?.chapterTarget ? {
            chapterTarget: {
              ...alignedSceneContext.chapterTarget,
              scene_cards: alignedSceneCards,
              sceneCards: alignedSceneCards,
            },
          } : {}),
        },
        wordTarget,
      )
      preparedGeneration = prepareProseGenerationContract(sceneContextPackage, options)
      // Contract merge may reshuffle target fields; keep strong handoff alignment authoritative.
      contextPackage = enrichContextWithProgressResync(enrichContextWithStrongHandoff(preparedGeneration.contextPackage))
      if (contextPackage?.chapter_target?.plan_stale) {
        try {
          const staleTarget = contextPackage.chapter_target || {}
          await updateNovelChapter(activeWorkspace, chapter.id, {
            chapter_goal: staleTarget.goal || staleTarget.chapter_goal || chapter.chapter_goal,
            chapter_summary: staleTarget.summary || staleTarget.chapter_summary || chapter.chapter_summary,
            conflict: staleTarget.conflict || chapter.conflict,
            raw_payload: {
              ...(chapter.raw_payload || {}),
              must_advance: staleTarget.must_advance || [],
              forbidden_repeats: staleTarget.forbidden_repeats || [],
              progress_resync: staleTarget.progress_resync || { plan_stale: true },
              plan_stale: true,
            },
          } as any, { createVersion: false })
          chapter = {
            ...chapter,
            chapter_goal: staleTarget.goal || chapter.chapter_goal,
            chapter_summary: staleTarget.summary || chapter.chapter_summary,
            conflict: staleTarget.conflict || chapter.conflict,
            raw_payload: {
              ...(chapter.raw_payload || {}),
              must_advance: staleTarget.must_advance || [],
              forbidden_repeats: staleTarget.forbidden_repeats || [],
              progress_resync: staleTarget.progress_resync || { plan_stale: true },
              plan_stale: true,
            },
          }
        } catch {
          // seed persist is best-effort; live context already carries resynced plan
        }
      }
      generationContract = prepareProseGenerationContract(contextPackage, options).contract
    }
  }
  await enforcePreparedGate(true)
  await onStage('scene_cards', {
    status: 'success',
    count: generationContract.chapter.scene_cards.length,
    scene_card_titles: generationContract.chapter.scene_cards
      .slice(0, 6)
      .map((card: any) => String(card?.title || card?.scene_title || card?.sceneTitle || `场景${card?.scene_no || card?.sceneNo || ''}`).trim())
      .filter(Boolean),
  })
  if (generatedSceneCardsThisRun && approvalRequired(approvalPolicy, 'scene_cards', approvals, { count: generationContract.chapter.scene_cards.length })) {
    await onStage('scene_cards', { status: 'needs_confirmation', count: generationContract.chapter.scene_cards.length })
    throw buildApprovalError('scene_cards', '新生成的场景卡等待人工确认', { count: generationContract.chapter.scene_cards.length })
  }
  if (isSceneCardsOnly) {
    await onStage('migration_plan', { status: 'skipped', reason: '生产模式：只生成场景卡' })
    await onStage('draft', { status: 'skipped', reason: '生产模式：只生成场景卡' })
    await onStage('review', { status: 'skipped', reason: '生产模式：只生成场景卡' })
    await onStage('revise', { status: 'skipped', reason: '生产模式：只生成场景卡' })
    await onStage('safety', { status: 'skipped', reason: '生产模式：只生成场景卡' })
    await onStage('store', { status: 'skipped', reason: '场景卡已保存到章节元数据' })
    await onStage('story_state', { status: 'skipped', reason: '未生成正文，无需更新状态机' })
    return {
      chapter,
      score: null,
      revised: false,
      production_mode: productionMode,
      completed_stage: 'scene_cards',
      story_state_update: { skipped: true },
      config_snapshot: configSnapshot,
    }
  }
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
  const prevChapters = compactPreviousChaptersForProse(chapters, chapter.chapter_no)
  throwIfChapterGenerationAborted()
  await onStage('migration_plan', { status: 'running' })
  const migrationPlan = await getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
  await onStage('migration_plan', { status: (migrationPlan as any)?.error ? 'warn' : 'success', active_reference_count: (migrationPlan as any)?.chapter_specific_plan?.active_reference_count || 0 })
  throwIfChapterGenerationAborted()
  const compiledPrompt = compileParagraphProseContext(project, generationContract, migrationPlan, chapter)
  await onStage('draft', { status: 'running', prompt_diagnostics: compiledPrompt.diagnostics })
  const draftResult = await generateNovelChapterProse(project, chapter, {
    worldbuilding,
    characters,
    outline: outlines,
    prompt: String(options.prompt || ''),
    prevChapters,
    contextPackage,
    migrationPlan,
    paragraphTask: compiledPrompt.prompt,
    promptDiagnostics: compiledPrompt.diagnostics,
    boundedProseContract: true,
    maxTokens: proseMaxTokensForWordTarget(wordTarget),
    abortSignal: options.abortSignal,
    llmTimeoutMs: options.llmTimeoutMs,
  } as any, {
    activeWorkspace,
    modelId: String(getStageModelId(project, 'draft', preferredModelId) || ''),
    skipMemoryStore: true,
  })
  assertCompleteProseTransportResult(draftResult, 'PROSE_DRAFT_TRUNCATED')
  const draftPromptDiagnostics = {
    ...compiledPrompt.diagnostics,
    model_usage: (draftResult as any)?.prose_prompt_diagnostics?.model_usage
      || (draftResult as any)?.usage
      || (draftResult as any)?.raw?.usage
      || null,
  }
  const resultPayload = getNovelPayload(draftResult)
  const draftProseChapters = Array.isArray(resultPayload?.prose_chapters)
    ? resultPayload.prose_chapters
    : Array.isArray(resultPayload?.proseChapters)
      ? resultPayload.proseChapters
      : []
  let targetProse: any
  try {
    targetProse = selectProseForChapter(resultPayload, chapter)
      || draftProseChapters.find((item: any) => Number(item?.chapter_no ?? item?.chapterNo) === Number(chapter.chapter_no))
      || draftProseChapters[0]
  } catch (error) {
    throw markBlockedInvalidError(error, {
      code: 'prose_wrong_chapter',
      source: 'prose_shape',
      message: '模型返回的正文不属于目标章节。',
    })
  }
  const generatedTitlePatch = buildGeneratedChapterTitlePatch(
    chapter,
    contextPackage?.chapter_target?.title_uniqueness_report,
    targetProse?.title || resultPayload?.title,
  )
  const plainProseFallback = extractPlainProseFallback(draftResult, 800)
  const chapterText = targetProse?.chapter_text || targetProse?.chapterText || resultPayload?.chapter_text || resultPayload?.chapterText || plainProseFallback
  if (!chapterText) {
    await onStage('draft', {
      status: 'failed',
      error: String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'),
      llm_diagnostics: buildLLMResultDiagnostics(draftResult),
    })
    const error = new Error(String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'))
    throw markBlockedInvalidError(error, validateMinimalChapterProse('').failures[0])
  }
  await onStage('draft', { status: 'success', word_count: countProseChars(chapterText), modelName: (draftResult as any).modelName, scene_status: 'generated', prompt_diagnostics: draftPromptDiagnostics, plain_text_fallback_used: Boolean(plainProseFallback && !targetProse?.chapter_text && !targetProse?.chapterText && !resultPayload?.chapter_text && !resultPayload?.chapterText) })
  let finalText = String(chapterText || '')
  const initialOpeningContinuityAssessment = assessInitialProseOpeningContinuity(finalText, enrichContextWithProgressResync(enrichContextWithStrongHandoff(contextPackage)))
  if (initialOpeningContinuityAssessment.failure) {
    const failure = initialOpeningContinuityAssessment.failure
    throw markBlockedInvalidError(Object.assign(new Error(failure.message), {
      code: 'PROSE_ADMISSION_BLOCKED_INVALID',
    }), failure)
  }
  let finalSceneBreakdown = targetProse?.scene_breakdown || targetProse?.sceneBreakdown || resultPayload?.scene_breakdown || resultPayload?.sceneBreakdown || []
  let ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts({
    ...(resultPayload || {}),
    ...(targetProse || {}),
    chapter_blueprint: targetProse?.chapter_blueprint
      || targetProse?.chapterBlueprint
      || resultPayload?.chapter_blueprint
      || resultPayload?.chapterBlueprint
      || contextPackage?.chapter_target?.chapter_blueprint
      || contextPackage?.chapter_target?.chapterBlueprint,
    scene_card_receipts: [
      ...asArray(resultPayload?.scene_card_receipts || resultPayload?.sceneCardReceipts),
      ...asArray(targetProse?.scene_card_receipts || targetProse?.sceneCardReceipts),
      ...asArray(finalSceneBreakdown)
        .map((scene: any) => scene?.scene_card_receipts || scene?.sceneCardReceipts)
        .filter(Boolean),
    ],
    delivery_risk_receipts: [
      ...asArray(resultPayload?.delivery_risk_receipts || resultPayload?.deliveryRiskReceipts),
      ...asArray(targetProse?.delivery_risk_receipts || targetProse?.deliveryRiskReceipts),
    ],
    revision_context_receipts: [
      ...asArray(resultPayload?.revision_context_receipts || resultPayload?.revisionContextReceipts),
      ...asArray(targetProse?.revision_context_receipts || targetProse?.revisionContextReceipts),
    ],
    revision_receipts: [
      ...asArray(resultPayload?.revision_receipts || resultPayload?.revisionReceipts),
      ...asArray(targetProse?.revision_receipts || targetProse?.revisionReceipts),
    ],
    artifact_protocol_receipts: [
      ...asArray(resultPayload?.artifact_protocol_receipts || resultPayload?.artifactProtocolReceipts),
      ...asArray(targetProse?.artifact_protocol_receipts || targetProse?.artifactProtocolReceipts),
    ],
    pre_draft_execution_receipts: resultPayload?.pre_draft_execution_receipts
      || resultPayload?.preDraftExecutionReceipts
      || targetProse?.pre_draft_execution_receipts
      || targetProse?.preDraftExecutionReceipts,
  }) || { chapter_blueprint: null, scene_card_receipts: [], delivery_risk_receipts: [], revision_context_receipts: [], revision_receipts: [], deslop_repair_receipts: [], quality_audit_repair_receipts: [], artifact_protocol_receipts: [], pre_draft_execution_receipts: null }
  let finalContinuityNotes = targetProse?.continuity_notes || targetProse?.continuityNotes || resultPayload?.continuity_notes || resultPayload?.continuityNotes || chapter.continuity_notes || []
  let editorRewrite: any = null
  let memePolish: any = null
  let readabilityReview: any = null
  const editorMemeResult = await runPostDraftEditorAndMemePolish({
    isDraftOnly,
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
  if (isDraftOnly || isDraftReviewOnly) {
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

}

  return {
    generateChapterForGroup,
  }
}
