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
  const qualityWarningCandidates: ProseAdmissionWarning[] = []
  throwIfChapterGenerationAborted()
  await onStage('word_target', { status: 'running', target: wordTarget.target, min: wordTarget.min, max: wordTarget.max, actual: countProseChars(finalText) })
  const wordTargetExpansionPatches: any[] = []
  let wordTargetCompatibility: any = null
  try {
    const wordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
    wordTargetCompatibility = wordTargetCheck.word_target_compatibility_pass ? wordTargetCheck : null
    finalText = wordTargetCheck.final_text || finalText
    if (wordTargetCheck.word_target_warning) qualityWarningCandidates.push(wordTargetCheck.word_target_warning)
    recordWordTargetExpansionPatch(wordTargetExpansionPatches, wordTargetCheck)
    if (wordTargetCheck.expanded && wordTargetCheck.expansion) {
      finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, wordTargetCheck.expansion.scene_breakdown, finalText)
      finalContinuityNotes = wordTargetCheck.expansion.continuity_notes?.length ? wordTargetCheck.expansion.continuity_notes : finalContinuityNotes
    }
    await onStage('word_target', { status: 'success', expanded: wordTargetCheck.expanded, contracted: wordTargetCheck.contracted, soft_pass: wordTargetCheck.word_target_soft_pass, compatibility_pass: wordTargetCheck.word_target_compatibility_pass === true, compatibility_ceiling: wordTargetCheck.compatibility_ceiling, contraction_attempts: wordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: wordTargetCheck.final_evaluation })
  } catch (error: any) {
    await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, contraction_attempts: error?.contraction_attempts, expansion_attempts: error?.expansion_attempts })
    throw error
  }
  if (isDraftOnly) {
    await onStage('editor', { status: 'skipped', reason: '生产模式：只生成并质检初稿' })
    await onStage('meme_polish', { status: 'skipped', reason: '生产模式：只生成并质检初稿' })
  }
  if (!isDraftOnly) {
    const preEditorText = finalText
    const preEditorSceneBreakdown = finalSceneBreakdown
    const preEditorContinuityNotes = finalContinuityNotes
    const preEditorWordTargetCompatibility = wordTargetCompatibility
    throwIfChapterGenerationAborted()
    await onStage('editor', { status: 'running' })
    try {
    editorRewrite = await runCommercialEditorRewrite(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
    finalText = editorRewrite.final_text || finalText
    if (editorRewrite.edited && editorRewrite.revision) {
      finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, editorRewrite.revision.scene_breakdown, finalText)
      finalContinuityNotes = editorRewrite.revision.continuity_notes?.length ? editorRewrite.revision.continuity_notes : finalContinuityNotes
    }
    await onStage('editor', {
      status: editorRewrite.edited ? 'success' : 'warn',
      edited: Boolean(editorRewrite.edited),
      word_count: countProseChars(finalText),
      editor_report: editorRewrite.editor_report,
    })
  } catch (editorError) {
    if (isAbortError(editorError)) throw editorError
    const editorErrorMessage = formatAdmissionError(editorError, 300)
    editorRewrite = { error: editorErrorMessage, edited: false }
    qualityWarningCandidates.push(proseAdmissionWarning('review', 'editor_unavailable', editorErrorMessage))
    await onStage('editor', { status: 'warn', error: formatAdmissionError(editorError, 200), reason: '商业主编改稿失败，保留当前稿' })
  }
  try {
    throwIfChapterGenerationAborted()
    const postEditorWordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
    const postEditorWordTargetWarning = wordTargetWarningAsError(wordTarget, postEditorWordTargetCheck)
    if (postEditorWordTargetWarning) {
      if (!validateMinimalChapterProse(postEditorWordTargetCheck.final_text || finalText).valid) throw postEditorWordTargetWarning
      qualityWarningCandidates.push(postEditorWordTargetCheck.word_target_warning)
    }
    wordTargetCompatibility = postEditorWordTargetCheck.word_target_compatibility_pass ? postEditorWordTargetCheck : null
    finalText = postEditorWordTargetCheck.final_text || finalText
    recordWordTargetExpansionPatch(wordTargetExpansionPatches, postEditorWordTargetCheck)
    if (postEditorWordTargetCheck.expanded && postEditorWordTargetCheck.expansion) {
      finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, postEditorWordTargetCheck.expansion.scene_breakdown, finalText)
      finalContinuityNotes = postEditorWordTargetCheck.expansion.continuity_notes?.length ? postEditorWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
      await onStage('word_target', { status: 'success', expanded: postEditorWordTargetCheck.expanded, contracted: postEditorWordTargetCheck.contracted, soft_pass: postEditorWordTargetCheck.word_target_soft_pass, contraction_attempts: postEditorWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postEditorWordTargetCheck.final_evaluation, phase: 'post_editor' })
    } else if (postEditorWordTargetCheck.word_target_compatibility_pass) {
      await onStage('word_target', { status: 'success', phase: 'post_editor', compatibility_pass: true, compatibility_ceiling: postEditorWordTargetCheck.compatibility_ceiling, contraction_attempts: postEditorWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postEditorWordTargetCheck.final_evaluation })
    }
  } catch (error: any) {
    if (error?.word_target_warning) qualityWarningCandidates.push(error.word_target_warning)
    const preEditorEvaluation = evaluateProseWordTarget(preEditorText, wordTarget)
    if ((error?.code === 'PROSE_WORD_TARGET_LONG' || error?.code === 'PROSE_WORD_TARGET_SHORT') && isRestorableWordTargetText(preEditorText, wordTarget, preEditorWordTargetCompatibility)) {
      finalText = preEditorText
      finalSceneBreakdown = preEditorSceneBreakdown
      finalContinuityNotes = preEditorContinuityNotes
      wordTargetCompatibility = preEditorWordTargetCompatibility
      const {
        final_text: _discardedEditorText,
        revision: _discardedEditorRevision,
        ...editorDiagnostics
      } = editorRewrite || {}
      editorRewrite = {
        ...editorDiagnostics,
        edited: false,
        discarded: true,
        discard_reason: 'post_editor_word_target_failed',
        word_target_failure: {
          code: error.code,
          evaluation: error?.evaluation,
          final_evaluation: error?.final_evaluation,
          contraction_attempts: error?.contraction_attempts,
          restored_evaluation: preEditorEvaluation,
        },
      }
      await onStage('word_target', {
        status: 'warn',
        phase: 'post_editor',
        error: String(error?.message || error),
        fallback: 'pre_editor',
        compatibility_pass: preEditorWordTargetCompatibility?.word_target_compatibility_pass === true,
        compatibility_ceiling: preEditorWordTargetCompatibility?.compatibility_ceiling,
        word_target: error?.word_target || wordTarget,
        evaluation: error?.evaluation,
        final_evaluation: error?.final_evaluation,
        restored_evaluation: preEditorEvaluation,
        contraction_attempts: error?.contraction_attempts,
      })
    } else {
      await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, contraction_attempts: error?.contraction_attempts, expansion_attempts: error?.expansion_attempts, phase: 'post_editor' })
      throw error
    }
  }
  throwIfChapterGenerationAborted()
  const preMemeText = finalText
  const preMemeSceneBreakdown = finalSceneBreakdown
  const preMemeContinuityNotes = finalContinuityNotes
  const preMemeWordTargetCompatibility = wordTargetCompatibility
  await onStage('meme_polish', { status: 'running' })
  try {
    memePolish = await runMemePolish(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
    finalText = memePolish.final_text || finalText
    if (memePolish.polished && memePolish.revision) {
      finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, memePolish.revision.scene_breakdown, finalText)
      finalContinuityNotes = memePolish.revision.continuity_notes?.length ? memePolish.revision.continuity_notes : finalContinuityNotes
    }
    await onStage('meme_polish', {
      status: memePolish.polished ? 'success' : 'skipped',
      polished: Boolean(memePolish.polished),
      meme_polish_report: memePolish.meme_polish_report,
    })
  } catch (memeError) {
    if (isAbortError(memeError)) throw memeError
    const memeErrorMessage = formatAdmissionError(memeError, 300)
    memePolish = { error: memeErrorMessage, polished: false }
    qualityWarningCandidates.push(proseAdmissionWarning('review', 'meme_polish_unavailable', memeErrorMessage))
    await onStage('meme_polish', { status: 'warn', error: formatAdmissionError(memeError, 200), reason: '网感润色失败，保留当前稿' })
  }
  try {
    throwIfChapterGenerationAborted()
    const postMemeWordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
    const postMemeWordTargetWarning = wordTargetWarningAsError(wordTarget, postMemeWordTargetCheck)
    if (postMemeWordTargetWarning) {
      if (!validateMinimalChapterProse(postMemeWordTargetCheck.final_text || finalText).valid) throw postMemeWordTargetWarning
      qualityWarningCandidates.push(postMemeWordTargetCheck.word_target_warning)
    }
    wordTargetCompatibility = postMemeWordTargetCheck.word_target_compatibility_pass ? postMemeWordTargetCheck : null
    finalText = postMemeWordTargetCheck.final_text || finalText
    recordWordTargetExpansionPatch(wordTargetExpansionPatches, postMemeWordTargetCheck)
    if (postMemeWordTargetCheck.expanded && postMemeWordTargetCheck.expansion) {
      finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, postMemeWordTargetCheck.expansion.scene_breakdown, finalText)
      finalContinuityNotes = postMemeWordTargetCheck.expansion.continuity_notes?.length ? postMemeWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
      await onStage('word_target', { status: 'success', expanded: postMemeWordTargetCheck.expanded, contracted: postMemeWordTargetCheck.contracted, soft_pass: postMemeWordTargetCheck.word_target_soft_pass, contraction_attempts: postMemeWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postMemeWordTargetCheck.final_evaluation, phase: 'post_meme_polish' })
    } else if (postMemeWordTargetCheck.word_target_compatibility_pass) {
      await onStage('word_target', { status: 'success', phase: 'post_meme_polish', compatibility_pass: true, compatibility_ceiling: postMemeWordTargetCheck.compatibility_ceiling, contraction_attempts: postMemeWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postMemeWordTargetCheck.final_evaluation })
    }
    } catch (error: any) {
      if (error?.word_target_warning) qualityWarningCandidates.push(error.word_target_warning)
      if ((error?.code === 'PROSE_WORD_TARGET_LONG' || error?.code === 'PROSE_WORD_TARGET_SHORT') && isRestorableWordTargetText(preMemeText, wordTarget, preMemeWordTargetCompatibility)) {
        finalText = preMemeText
        finalSceneBreakdown = preMemeSceneBreakdown
        finalContinuityNotes = preMemeContinuityNotes
        wordTargetCompatibility = preMemeWordTargetCompatibility
        const { final_text: _discardedMemeText, revision: _discardedMemeRevision, ...memeDiagnostics } = memePolish || {}
        memePolish = {
          ...memeDiagnostics,
          polished: false,
          discarded: true,
          discard_reason: 'post_meme_word_target_failed',
          word_target_failure: {
            code: error.code,
            evaluation: error?.evaluation,
            final_evaluation: error?.final_evaluation,
            contraction_attempts: error?.contraction_attempts,
            restored_evaluation: evaluateProseWordTarget(preMemeText, wordTarget),
          },
        }
        await onStage('word_target', { status: 'warn', phase: 'post_meme_polish', error: String(error?.message || error), fallback: 'pre_meme', compatibility_pass: preMemeWordTargetCompatibility?.word_target_compatibility_pass === true, compatibility_ceiling: preMemeWordTargetCompatibility?.compatibility_ceiling, contraction_attempts: error?.contraction_attempts })
      } else {
        await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, contraction_attempts: error?.contraction_attempts, expansion_attempts: error?.expansion_attempts, phase: 'post_meme_polish' })
        throw error
      }
    }
  }
  throwIfChapterGenerationAborted()
  await onStage('review', { status: 'running' })
  finalText = normalizeProseForStorage(finalText)
  let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>
  try {
    qualityLoop = await runProseQualityLoop({
      initialText: finalText,
      minScore: qualityThreshold,
      coreContract: buildFocusedQualityCoreContract(generationContract),
      continuityContext: contextPackage,
      maxRevisionRounds: isDraftReviewOnly || isDraftOnly ? 0 : 1,
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
        const result = await executeAgent('prose-agent', project, { task: prompt }, {
          activeWorkspace,
          modelId: String(getStageModelId(project, 'review', preferredModelId) || ''),
          maxTokens: proseMaxTokensForWordTarget(wordTarget),
          temperature: 0.25,
          skipMemory: true,
          signal: options.abortSignal,
          timeoutMs: qualityRepairTimeoutMs,
        })
        assertCompleteProseTransportResult(result, 'PROSE_REVISION_TRUNCATED')
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
  finalText = qualityLoop.final_text
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
