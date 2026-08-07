/** Reverse-free handler binding extracted from NovelProjectWorkspaceView. */
import {
  createChapterPrepHandlers,
} from './workspace-chapter-prep-handlers'
import {
  createChapterProseHandlers,
} from './workspace-chapter-prose-handlers'
import {
  createChapterVersionHandlers,
  createProjectAssetDeleteHandlers,
  createSceneCardHandlers,
} from './workspace-chapter-version-handlers'
import {
  createCommercialToolHandlers,
} from './workspace-commercial-tools'
import {
  createCreativeHandlers,
} from './workspace-creative-handlers'
import {
  createDiagnosticsHandlers,
} from './workspace-diagnostics-handlers'
import {
  createEditorHandlers,
} from './workspace-editor-handlers'
import {
  createEditorReportHandlers,
} from './workspace-editor-report-handlers'
import {
  createPlanningHandlers,
} from './workspace-planning-handlers'
import {
  createPreflightHandlers,
} from './workspace-preflight-handlers'
import {
  createProductionHandlers,
} from './workspace-production-handlers'
import {
  createRepairTaskHandlers,
} from './workspace-repair-task-handlers'
import {
  createRunQueueHandlers,
} from './workspace-run-queue-handlers'
import {
  createStyleSampleHandlers,
} from './workspace-style-sample-handlers'
import {
  createWritingBibleHandlers,
} from './workspace-writing-bible-handlers'
import {
  createWritingQueueHandlers,
} from './workspace-writing-queue-handlers'

export function bindNovelWorkspaceCoreHandlers(deps: Record<string, any>) {
  const {
    activeChapter,
    activeChapterId,
    agentConfigForm,
    apiClient,
    approvalPolicyForm,
    autoCreationDirectorModel,
    backupImportText,
    chapterHasProse,
    getChapterGenerationSourceAuthority,
    getChapterSourceMutationPending,
    beginChapterSourceOperation,
    assertChapterSourceOperationCurrent,
    chapterWordTargetPayload,
    chapters,
    characters,
    commercialToolLoading,
    confirmReferenceReady,
    creativeAssistantSelectedText,
    creativeCommandText,
    editorForm,
    editorItem,
    editorKind,
    flushPendingSave,
    formatStoryStateSyncFailure,
    future100Draft,
    future100SelectedNos,
    latestCockpitQualityReport,
    loadProductionTasks,
    loadProjectModules,
    navigate,
    openStoryAssetsWorkspace,
    activeContextPackageData,
    outlines,
    productionMode,
    projectId,
    proseBatchCancelRef,
    reviews,
    rollbackChapterVersion,
    runRecords,
    selectChapterForWriting,
    selectTargetChapterForWriting,
    selectedChapterIds,
    selectedModelId,
    selectedProject,
    setActiveChapterId,
    setAgentExecution,
    setAutoDirectorActionLoadingKey,
    setBackupImportOpen,
    setBackupImportText,
    setChapterGroupExecutingId,
    setChapterVersionDetail,
    setChapters,
    setCommercialReadiness,
    setCommercialToolLoading,
    setContinuityAudit,
    setContinuityAuditLoading,
    setCreativeAssistantError,
    setCreativeAssistantLoading,
    setCreativeAssistantOpen,
    setCreativeAssistantResult,
    setCreativeAssistantSelectedText,
    setCreativeCommandPlan,
    setDashboardLoading,
    setDiagnosticsLoading,
    setEditorItem,
    setEditorKind,
    setEditorReportLoading,
    setExecutingAgents,
    setFuture100ApplyLoading,
    setFuture100Draft,
    setFuture100FocusOutlineIds,
    setFuture100SelectedNos,
    setGeneratingProse,
    setGeneratingSceneCards,
    setGenerationPipeline,
    setIncubatingOriginal,
    setOutlinePanelOpen,
    setOutlineTreeOpen,
    setPipelineLoading,
    setPlanProgress,
    setPlanning,
    setProseBatchStatus,
    setProseProgress,
    setProseQualityLoading,
    setReleaseRepairExecutingId,
    setReviewAnnotationsOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectMode,
    setSelectedChapterIds,
    setSelectedProject,
    setStepOutlineLoading,
    setStepProseLoading,
    setStreamingChapterId,
    setStreamingPercent,
    setStreamingProgress,
    setStreamingText,
    setTaskCenterOpen,
    setBookReviewLoading,
    setStoryStateOpen,
    setStyleSampleCandidateLoading,
    setStyleSampleEffectiveness,
    setStyleSampleEffectivenessLoading,
    setStyleSamplePatchLoadingKey,
    setWorkspaceArea,
    setWritingBibleGenerating,
    setWritingBibleOpen,
    storyStateForm,
    writingBibleForm,
    sortedChapters,
    unattendedTargetChapter,
    worldbuilding,
  } = deps

  const {
    mergeChapterVersion,
    acceptChapterVersion,
  } = createChapterVersionHandlers({
    activeChapter,
    apiClient,
    flushPendingSave,
    loadProjectModules,
    projectId,
    rollbackChapterVersion,
    setChapterVersionDetail,
    setChapters,
  })


  /* ── 大纲生成 ──────────────────────────────────────────────────── */
  const {
    handleOutlineGenerate,
    runPlan,
    executeAgents,
  } = createPlanningHandlers({
    apiClient,
    projectId,
    selectedModelId,
    flushPendingSave,
    loadProjectModules,
    confirmReferenceReady,
    setAgentExecution,
    setExecutingAgents,
    setOutlinePanelOpen,
    setPlanProgress,
    setPlanning,
    setStepOutlineLoading,
  })

  const showGenerationBlockedModalRef = { current: null as null | ((...args: any[]) => any) }
  const showDiagnosticsModalRef = { current: null as null | ((...args: any[]) => any) }
  const showGenerationBlockedModalProxy = (...args: any[]) => {
    if (!showGenerationBlockedModalRef.current) {
      throw new Error('showGenerationBlockedModal is not ready')
    }
    return showGenerationBlockedModalRef.current(...args)
  }
  const showDiagnosticsModalProxy = (...args: any[]) => {
    if (!showDiagnosticsModalRef.current) {
      throw new Error('showDiagnosticsModal is not ready')
    }
    return showDiagnosticsModalRef.current(...args)
  }

  const {
    generateSceneCardsForChapter,
    generateSceneCardsForActiveChapter,
  } = createSceneCardHandlers({
    apiClient,
    flushPendingSave,
    loadProjectModules,
    projectId,
    selectedModelId,
    setChapters,
    setGeneratingSceneCards,
    showGenerationBlockedModal: showGenerationBlockedModalProxy,
    activeChapterId,
  })

  const {
    buildPreDraftBriefForActiveChapter,
    confirmPreDraftBriefForActiveChapter,
    savePreDraftBriefForActiveChapter,
    applyStyleSampleActionForChapter,
    applyStyleSampleActionForActiveChapter,
  } = createChapterPrepHandlers({
    activeChapter,
    apiClient,
    flushPendingSave,
    loadProjectModules,
    projectId,
    selectChapterForWriting,
    setChapters,
    setCommercialToolLoading,
  })

  const {
    openProductionDashboard,
    runOriginalIncubator,
    startChapterGroupGeneration,
    startReadyChapterGroupGeneration,
    startFuture100ChapterGroupGeneration,
    startUnattendedWritingGoal,
  } = createProductionHandlers({
    activeChapter,
    apiClient,
    chapterWordTargetPayload,
    loadProductionTasks,
    loadProjectModules,
    productionMode,
    projectId,
    selectChapterForWriting,
    selectedModelId,
    selectedProject,
    setCommercialReadiness,
    setCommercialToolLoading,
    setDashboardLoading,
    setIncubatingOriginal,
    setRightPanelOpen,
    setRightPanelTab,
    setTaskCenterOpen,
    sortedChapters,
    unattendedTargetChapter,
  })

  const applyEditorRevisionRef = { current: null as null | ((...args: any[]) => any) }
  const runRollingPlanRef = { current: null as null | ((...args: any[]) => any) }
  const executeStyleSampleTaskBookRebuildRef = { current: null as null | ((...args: any[]) => any) }
  const generateLongformRepairAuditSummaryRef = { current: null as null | ((...args: any[]) => any) }
  const generateCurrentChapterProseRef = { current: null as null | ((...args: any[]) => any) }
  const generateSceneCardsForChapterRef = { current: null as null | ((...args: any[]) => any) }
  const runSimilarityForChapterRef = { current: null as null | ((...args: any[]) => any) }
  const {
    createEditorReport,
    createEditorReportForChapter,
  } = createEditorReportHandlers({
    activeChapter,
    apiClient,
    applyEditorRevision: (...args: any[]) => {
      if (!applyEditorRevisionRef.current) {
        throw new Error('applyEditorRevision is not ready')
      }
      return applyEditorRevisionRef.current(...args)
    },
    flushPendingSave,
    loadProjectModules,
    projectId,
    selectedModelId,
    setEditorReportLoading,
    setRightPanelOpen,
    setRightPanelTab,
  })

  const {
    openEditor,
    submitEditor,
  } = createEditorHandlers({
    apiClient,
    editorForm,
    editorItem,
    editorKind,
    flushPendingSave,
    loadProjectModules,
    projectId,
    setEditorItem,
    setEditorKind,
    worldbuilding,
  })

  const {
    locateRepairTaskChapter,
    openRepairTaskChapterEditor,
    startRepairTaskRevision,
    updateRepairTaskStatus,
    bulkUpdateRepairTaskStatus,
    resolveRepairQueueTaskChapterId,
    executeRecoveryEvidenceGovernanceQueueTask,
    executeTypedRepairTask,
    refreshActiveProseQuality,
    repairActiveDeslopGate,
    refreshProseQualityForChapter,
    closeRepairTaskAfterRevision,
    isSingleChapterRecoveryEvidenceRepairTask,
    recheckRepairTaskConvergence,
    applyEditorRevision
  } = createRepairTaskHandlers({
    activeChapter,
    apiClient,
    chapters,
    createEditorReportForChapter,
    executeStyleSampleTaskBookRebuild: (...args: any[]) => {
      if (!executeStyleSampleTaskBookRebuildRef.current) {
        throw new Error('executeStyleSampleTaskBookRebuild is not ready')
      }
      return executeStyleSampleTaskBookRebuildRef.current(...args)
    },
    flushPendingSave,
    generateCurrentChapterProse: (...args: any[]) => {
      if (!generateCurrentChapterProseRef.current) {
        throw new Error('generateCurrentChapterProse is not ready')
      }
      return generateCurrentChapterProseRef.current(...args)
    },
    generateLongformRepairAuditSummary: (...args: any[]) => {
      if (!generateLongformRepairAuditSummaryRef.current) {
        throw new Error('generateLongformRepairAuditSummary is not ready')
      }
      return generateLongformRepairAuditSummaryRef.current(...args)
    },
    generateSceneCardsForChapter: (...args: any[]) => {
      if (!generateSceneCardsForChapterRef.current) {
        throw new Error('generateSceneCardsForChapter is not ready')
      }
      return generateSceneCardsForChapterRef.current(...args)
    },
    latestCockpitQualityReport,
    loadProjectModules,
    loadProductionTasks,
    openEditor,
    outlines,
    projectId,
    reviews,
    runRecords,
    runRollingPlan: (...args: any[]) => {
      if (!runRollingPlanRef.current) {
        throw new Error('runRollingPlan is not ready')
      }
      return runRollingPlanRef.current(...args)
    },
    runSimilarityForChapter: (...args: any[]) => {
      if (!runSimilarityForChapterRef.current) {
        throw new Error('runSimilarityForChapter is not ready')
      }
      return runSimilarityForChapterRef.current(...args)
    },
    selectChapterForWriting,
    selectedModelId,
    setActiveChapterId,
    setChapters,
    setCommercialToolLoading,
    setFuture100FocusOutlineIds,
    setOutlineTreeOpen,
    setProseQualityLoading,
    setReviewAnnotationsOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectedProject,
    setTaskCenterOpen,
    sortedChapters,
  })
  applyEditorRevisionRef.current = applyEditorRevision

  const {
    recheckStyleSampleTaskBookReviewTasks,
    generateLongformRepairAuditSummary,
    executeStyleSampleTaskBookRebuild,
  } = createStyleSampleHandlers({
    apiClient,
    applyStyleSampleActionForChapter,
    autoCreationDirectorModel,
    loadProductionTasks,
    loadProjectModules,
    projectId,
    setTaskCenterOpen,
    sortedChapters,
    updateRepairTaskStatus,
  })
  executeStyleSampleTaskBookRebuildRef.current = executeStyleSampleTaskBookRebuild
  generateLongformRepairAuditSummaryRef.current = generateLongformRepairAuditSummary
  generateSceneCardsForChapterRef.current = generateSceneCardsForChapter

  const {
    fillWritingBibleForm,
    fillDefaultStyleSampleBank,
    extractStyleSampleCandidates,
    openWritingBibleEditor,
    previewStyleSampleAdjustmentPatch,
    previewStyleSampleAdjustmentBatch,
    undoStyleSampleAdjustmentPatch,
    repairStyleSamplePatchReviewSelection,
    reviewStyleSampleAdjustmentPatch,
    generateWritingBibleEditor,
    saveWritingBibleEditor,
    openStoryStateEditor,
    saveStoryStateEditor,
    runBookReview,
  } = createWritingBibleHandlers({
    activeChapter,
    activeContextPackageData,
    apiClient,
    applyStyleSampleActionForActiveChapter,
    loadProjectModules,
    projectId,
    selectedModelId,
    selectedProject,
    setBookReviewLoading,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectedProject,
    setStoryStateOpen,
    setStyleSampleCandidateLoading,
    setStyleSampleEffectiveness,
    setStyleSampleEffectivenessLoading,
    setStyleSamplePatchLoadingKey,
    setWorkspaceArea,
    setWritingBibleGenerating,
    setWritingBibleOpen,
    storyStateForm,
    writingBibleForm,
  })

  const {
    showCommercialResult,
    runCommercialTool,
    openApprovalPolicyEditor,
    openAgentConfigEditor,
    runSimilarityForChapter,
    runSimilarityForActiveChapter,
    runReferenceMigrationPlan,
    runVersionReviewForActiveChapter,
    showFuture100SkeletonModal,
    runFuture100SkeletonAudit,
    generateFuture100Skeleton,
    applyFuture100SkeletonDraft,
    runTopicValidation,
    runQualityBenchmark,
    runFirst30RetentionDiagnosis,
    createFirst30RetentionRepairQueue,
    runReaderTrialReview,
    createReaderTrialRepairQueue,
    createStyleSampleBatchRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createDeliveryRiskRepairQueue,
    runLongformCreationDiagnosis,
    runLongformPressureTest,
    openProductionMetrics,
    openLongformProductionTrends,
    createLongformProductionRepairQueue,
    openMaterialRepairPlan,
    openContinuityAudit,
    syncStoryStateForChapter,
    refreshConsistencyAudit,
    openReferenceKnowledgeDiagnosis,
    runMechanicalQa,
    runMechanicalQaLlmReview,
    createMechanicalQaRepairQueue,
    refreshPropagationDebt,
    runPropagationDebtLlmPlan,
    openModelDiagnostics,
    openGenreTemplates,
    createBackupSnapshot,
    runRollingPlan,
  } = createCommercialToolHandlers({
    activeChapter,
    activeChapterId,
    apiClient,
    chapters,
    characters,
    commercialToolLoading,
    flushPendingSave,
    future100Draft,
    future100SelectedNos,
    loadProductionTasks,
    loadProjectModules,
    openStoryStateEditor,
    outlines,
    projectId,
    reviews,
    selectChapterForWriting,
    selectTargetChapterForWriting,
    selectedModelId,
    setAutoDirectorActionLoadingKey,
    setCommercialToolLoading,
    setContinuityAudit,
    setContinuityAuditLoading,
    setFuture100ApplyLoading,
    setFuture100Draft,
    setFuture100FocusOutlineIds,
    setFuture100SelectedNos,
    setOutlineTreeOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectedProject,
    setTaskCenterOpen,
    sortedChapters,
    startFuture100ChapterGroupGeneration,
    agentConfigForm,
    approvalPolicyForm,
    formatStoryStateSyncFailure,
    chapterHasProse,
    autoCreationDirectorModel,
  })

  const {
    repairWritingQueuePlan,
    repairWritingQueuePlanBatch,
  } = createWritingQueueHandlers({
    runRollingPlan,
    selectChapterForWriting,
  })
  runRollingPlanRef.current = runRollingPlan
  runSimilarityForChapterRef.current = runSimilarityForChapter


  const {
    downloadBackupPackage,
    importBackupPackage,
    runCreativeCommand,
    openCreativeAssistant,
    copyCreativeAssistantCard,
    runCreativeAssistant,
  } = createCreativeHandlers({
    activeChapter,
    apiClient,
    backupImportText,
    creativeAssistantSelectedText,
    creativeCommandText,
    loadProductionTasks,
    loadProjectModules,
    navigate,
    projectId,
    selectedModelId,
    setBackupImportOpen,
    setBackupImportText,
    setCommercialToolLoading,
    setCreativeAssistantError,
    setCreativeAssistantLoading,
    setCreativeAssistantOpen,
    setCreativeAssistantResult,
    setCreativeAssistantSelectedText,
    setCreativeCommandPlan,
  })

  const {
    openRunQueue,
    openProductionDesk,
    startRunQueueWorker,
    stopRunQueueWorker,
    recoverRunQueue,
    executeChapterGroupRun,
    approveChapterGroupStage,
    retryChapterGroupStage,
    skipChapterGroupStage,
    executeReleaseRepairRun,
    startChapterPipeline,
    handleRestructure,
  } = createRunQueueHandlers({
    activeChapter,
    apiClient,
    chapterWordTargetPayload,
    flushPendingSave,
    loadProductionTasks,
    loadProjectModules,
    navigate,
    productionMode,
    projectId,
    runCommercialTool,
    selectedChapterIds,
    selectedModelId,
    setChapterGroupExecutingId,
    setChapters,
    setPipelineLoading,
    setReleaseRepairExecutingId,
    setSelectMode,
    setSelectedChapterIds,
    setTaskCenterOpen,
  })

  const {
    deleteProject,
    deleteChapter,
    deleteOutline,
  } = createProjectAssetDeleteHandlers({
    apiClient,
    flushPendingSave,
    loadProjectModules,
    navigate,
    selectedProject,
  })

  const {
    generationPreflightChecks,
    repairGenerationPreflightGaps,
    runGenerationPreflightRepairSpec,
    buildGenerationPreflightRepairActions,
    renderGenerationPreflightRepairActions,
    renderPreflightModalContent,
    showGenerationBlockedModal,
    showDiagnosticsModal,
    showCommercialReadinessModal,
  } = createPreflightHandlers({
    activeChapter,
    apiClient,
    applyStyleSampleActionForChapter,
    buildPreDraftBriefForActiveChapter,
    getChapterGenerationSourceAuthority,
    getChapterSourceMutationPending,
    beginChapterSourceOperation,
    assertChapterSourceOperationCurrent,
    flushPendingSave,
    generateSceneCardsForChapter,
    loadProjectModules,
    openEditor,
    openStoryAssetsWorkspace,
    openStoryStateEditor,
    projectId,
    selectChapterForWriting,
    selectedModelId,
    setOutlineTreeOpen,
    sortedChapters,
    syncStoryStateForChapter,
  })
  showGenerationBlockedModalRef.current = showGenerationBlockedModal
  showDiagnosticsModalRef.current = showDiagnosticsModal


  const {
    openGenerationDiagnostics,
    openChapterQualityCardForChapter,
    openChapterQualityCard,
  } = createDiagnosticsHandlers({
    activeChapter,
    apiClient,
    flushPendingSave,
    projectId,
    setDiagnosticsLoading,
    showDiagnosticsModal,
  })

  const {
    stepGenerateProse,
    generateCurrentChapterProse,
    repairContextAndGenerateCurrentChapter,
  } = createChapterProseHandlers({
    activeChapter,
    apiClient,
    autoCreationDirectorModel,
    getChapterGenerationSourceAuthority,
    getChapterSourceMutationPending,
    beginChapterSourceOperation,
    assertChapterSourceOperationCurrent,
    chapterWordTargetPayload,
    chapters,
    characters,
    confirmReferenceReady,
    flushPendingSave,
    loadProjectModules,
    outlines,
    projectId,
    selectedModelId,
    setChapters,
    setGeneratingProse,
    setGenerationPipeline,
    setRightPanelOpen,
    setRightPanelTab,
    setStreamingChapterId,
    setStreamingPercent,
    setStreamingProgress,
    setStreamingText,
    showGenerationBlockedModal,
    proseBatchCancelRef,
    setProseBatchStatus,
    setProseProgress,
    setStepProseLoading,
    sortedChapters,
    worldbuilding,
  })
  generateCurrentChapterProseRef.current = generateCurrentChapterProse

  return {
    acceptChapterVersion,
    applyEditorRevision,
    extractStyleSampleCandidates,
    fillDefaultStyleSampleBank,
    fillWritingBibleForm,
    generateWritingBibleEditor,
    openStoryStateEditor,
    openWritingBibleEditor,
    previewStyleSampleAdjustmentBatch,
    previewStyleSampleAdjustmentPatch,
    repairStyleSamplePatchReviewSelection,
    reviewStyleSampleAdjustmentPatch,
    runBookReview,
    saveStoryStateEditor,
    saveWritingBibleEditor,
    undoStyleSampleAdjustmentPatch,
    applyFuture100SkeletonDraft,
    applyStyleSampleActionForActiveChapter,
    applyStyleSampleActionForChapter,
    approveChapterGroupStage,
    buildGenerationPreflightRepairActions,
    buildPreDraftBriefForActiveChapter,
    bulkUpdateRepairTaskStatus,
    closeRepairTaskAfterRevision,
    confirmPreDraftBriefForActiveChapter,
    copyCreativeAssistantCard,
    createBackupSnapshot,
    createDeliveryRiskRepairQueue,
    createEditorReport,
    createEditorReportForChapter,
    createFirst30RetentionRepairQueue,
    createLongformProductionRepairQueue,
    createMechanicalQaRepairQueue,
    createReaderTrialRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createStyleSampleBatchRepairQueue,
    deleteChapter,
    deleteOutline,
    deleteProject,
    downloadBackupPackage,
    executeAgents,
    executeChapterGroupRun,
    executeRecoveryEvidenceGovernanceQueueTask,
    executeReleaseRepairRun,
    executeStyleSampleTaskBookRebuild,
    executeTypedRepairTask,
    generateCurrentChapterProse,
    generateFuture100Skeleton,
    generateLongformRepairAuditSummary,
    generateSceneCardsForActiveChapter,
    generateSceneCardsForChapter,
    generationPreflightChecks,
    handleOutlineGenerate,
    handleRestructure,
    importBackupPackage,
    isSingleChapterRecoveryEvidenceRepairTask,
    locateRepairTaskChapter,
    mergeChapterVersion,
    openAgentConfigEditor,
    openApprovalPolicyEditor,
    openChapterQualityCard,
    openChapterQualityCardForChapter,
    openContinuityAudit,
    openCreativeAssistant,
    openEditor,
    openGenerationDiagnostics,
    openGenreTemplates,
    openLongformProductionTrends,
    openMaterialRepairPlan,
    openModelDiagnostics,
    openProductionDashboard,
    openProductionDesk,
    openProductionMetrics,
    openReferenceKnowledgeDiagnosis,
    openRepairTaskChapterEditor,
    openRunQueue,
    recheckRepairTaskConvergence,
    recheckStyleSampleTaskBookReviewTasks,
    recoverRunQueue,
    refreshActiveProseQuality,
    refreshConsistencyAudit,
    refreshPropagationDebt,
    refreshProseQualityForChapter,
    renderGenerationPreflightRepairActions,
    renderPreflightModalContent,
    repairActiveDeslopGate,
    repairContextAndGenerateCurrentChapter,
    repairGenerationPreflightGaps,
    repairWritingQueuePlan,
    repairWritingQueuePlanBatch,
    resolveRepairQueueTaskChapterId,
    retryChapterGroupStage,
    runCommercialTool,
    runCreativeAssistant,
    runCreativeCommand,
    runFirst30RetentionDiagnosis,
    runFuture100SkeletonAudit,
    runGenerationPreflightRepairSpec,
    runLongformCreationDiagnosis,
    runLongformPressureTest,
    runMechanicalQa,
    runMechanicalQaLlmReview,
    runOriginalIncubator,
    runPlan,
    runPropagationDebtLlmPlan,
    runQualityBenchmark,
    runReaderTrialReview,
    runReferenceMigrationPlan,
    runRollingPlan,
    runSimilarityForActiveChapter,
    runSimilarityForChapter,
    runTopicValidation,
    runVersionReviewForActiveChapter,
    savePreDraftBriefForActiveChapter,
    showCommercialReadinessModal,
    showCommercialResult,
    showDiagnosticsModal,
    showFuture100SkeletonModal,
    showGenerationBlockedModal,
    skipChapterGroupStage,
    startChapterGroupGeneration,
    startChapterPipeline,
    startFuture100ChapterGroupGeneration,
    startReadyChapterGroupGeneration,
    startRepairTaskRevision,
    startRunQueueWorker,
    startUnattendedWritingGoal,
    stepGenerateProse,
    stopRunQueueWorker,
    submitEditor,
    syncStoryStateForChapter,
    updateRepairTaskStatus,
  }
}
