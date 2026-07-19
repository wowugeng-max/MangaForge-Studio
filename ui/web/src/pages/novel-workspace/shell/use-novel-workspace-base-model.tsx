import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  message,
} from 'antd'
import type { EditorView } from '@codemirror/view'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import apiClient from '../../../api/client'
import {
  selectTargetChapterForWriting,
} from '../writingCockpitModel'
import {
  useChapterAutosave,
} from '../useChapterAutosave'
import {
  useChapterVersions,
} from '../useChapterVersions'
import {
  useNovelWorkspaceData,
} from '../useNovelWorkspaceData'
import {
  useNovelProjectWorkspaceUiState,
} from '../useNovelProjectWorkspaceUiState'
import {
  useReferenceWorkflow,
} from '../useReferenceWorkflow'
import {
  useWorkspaceTasks,
} from '../useWorkspaceTasks'
import {
  chapterHasProse,
} from '../utils'
import {
  filterReviewsByType,
  resolveActiveChapterOwnedData,
  resolveActiveMemorySummary,
} from './workspace-derived-state'
import {
  formatStoryStateSyncFailure,
} from './workspace-helpers'
import {
  productionModeOptions,
} from './workspace-types'
import {
  bindNovelWorkspaceCoreHandlers,
} from './workspace-view-bind-core-handlers'
import {
  useNovelWorkspaceChapterLoads,
} from './use-workspace-chapter-loads'
import {
  useNovelWorkspaceDomainModels,
} from './use-workspace-domain-models'

type AnyRecord = Record<string, any>

export function useNovelWorkspaceBaseModel() {
  const navigate = useNavigate()
  const { id } = useParams()
  const projectId = Number(id)

  const ui = useNovelProjectWorkspaceUiState()
  const {
    stepOutlineLoading, setStepOutlineLoading,
    stepProseLoading, setStepProseLoading,
    stepRepairLoading, setStepRepairLoading,
    proseProgress, setProseProgress,
    proseBatchStatus, setProseBatchStatus,
    planProgress, setPlanProgress,
    planning, setPlanning,
    executingAgents, setExecutingAgents,
    generatingProse, setGeneratingProse,
    generatingSceneCards, setGeneratingSceneCards,
    diagnosticsLoading, setDiagnosticsLoading,
    pipelineLoading, setPipelineLoading,
    incubatingOriginal, setIncubatingOriginal,
    dashboardLoading, setDashboardLoading,
    editorReportLoading, setEditorReportLoading,
    proseQualityLoading, setProseQualityLoading,
    bookReviewLoading, setBookReviewLoading,
    writingBibleOpen, setWritingBibleOpen,
    writingBibleGenerating, setWritingBibleGenerating,
    styleSampleCandidateLoading, setStyleSampleCandidateLoading,
    styleSampleEffectivenessLoading, setStyleSampleEffectivenessLoading,
    styleSamplePatchLoadingKey, setStyleSamplePatchLoadingKey,
    styleSampleEffectiveness, setStyleSampleEffectiveness,
    storyStateOpen, setStoryStateOpen,
    commercialToolsOpen, setCommercialToolsOpen,
    creativeCommandOpen, setCreativeCommandOpen,
    creativeCommandText, setCreativeCommandText,
    creativeCommandPlan, setCreativeCommandPlan,
    creativeAssistantOpen, setCreativeAssistantOpen,
    creativeAssistantMode, setCreativeAssistantMode,
    creativeAssistantLoading, setCreativeAssistantLoading,
    creativeAssistantResult, setCreativeAssistantResult,
    creativeAssistantError, setCreativeAssistantError,
    creativeAssistantSelectedText, setCreativeAssistantSelectedText,
    backupImportOpen, setBackupImportOpen,
    backupImportText, setBackupImportText,
    chapterGroupExecutingId, setChapterGroupExecutingId,
    releaseRepairExecutingId, setReleaseRepairExecutingId,
    commercialToolLoading, setCommercialToolLoading,
    productionMode, setProductionMode,
    unattendedTargetChapter, setUnattendedTargetChapter,
    chapterWordTargetMode, setChapterWordTargetMode,
    chapterTargetWordCount, setChapterTargetWordCount,
    activeChapterDiagnostics, setActiveChapterDiagnostics,
    diagnosticsRequestRef,
    activeChapterContextPackage, setActiveChapterContextPackage,
    contextPackageLoading, setContextPackageLoading,
    contextPackageRequestRef,
    commercialReadiness, setCommercialReadiness,
    future100Draft, setFuture100Draft,
    future100SelectedNos, setFuture100SelectedNos,
    future100ApplyLoading, setFuture100ApplyLoading,
    future100FocusOutlineIds, setFuture100FocusOutlineIds,
    projectSettings, setProjectSettings,
    memoryPalaceProjects, setMemoryPalaceProjects,
    chapterWordTargetPayload,
    styleSampleEffectivenessItems,
    outlinePanelOpen, setOutlinePanelOpen,
    referenceConfigOpen, setReferenceConfigOpen,
    referenceEngineeringOpen, setReferenceEngineeringOpen,
    creativeCardsOpen, setCreativeCardsOpen,
    consistencyGraphOpen, setConsistencyGraphOpen,
    qualityBenchmarkOpen, setQualityBenchmarkOpen,
    exportDeliveryOpen, setExportDeliveryOpen,
    reviewAnnotationsOpen, setReviewAnnotationsOpen,
    agentAuditOpen, setAgentAuditOpen,
    continuityAudit, setContinuityAudit,
    continuityAuditLoading, setContinuityAuditLoading,
    chapterDrawerOpen, setChapterDrawerOpen,
    outlineTreeOpen, setOutlineTreeOpen,
    taskCenterOpen, setTaskCenterOpen,
    taskCenterRecoveryFocus, setTaskCenterRecoveryFocus,
    selectedChapterIds, setSelectedChapterIds,
    selectMode, setSelectMode,
    restructurePanelOpen, setRestructurePanelOpen,
    chapterSearch, setChapterSearch,
    chapterStatusFilter, setChapterStatusFilter,
    chapterSortMode, setChapterSortMode,
    streamingChapterId, setStreamingChapterId,
    streamingText, setStreamingText,
    streamingProgress, setStreamingProgress,
    streamingPercent, setStreamingPercent,
    generationPipeline, setGenerationPipeline,
    streamingEndRef,
    proseBatchCancelRef,
    editorKind, setEditorKind,
    editorItem, setEditorItem,
    editorForm,
    writingBibleForm,
    storyStateForm,
    approvalPolicyForm,
    agentConfigForm,
    rightPanelOpen, setRightPanelOpen,
    rightPanelTab, setRightPanelTab,
    workspaceArea, setWorkspaceArea,
    writingShellMode, setWritingShellMode,
    directoryCollapsed, setDirectoryCollapsed,
    storyAssetsFocusDiscoveredToken, setStoryAssetsFocusDiscoveredToken,
    autoDirectorActionLoadingKey, setAutoDirectorActionLoadingKey,
    shellMode,
    isImmersiveShell,
    showGlobalWritingGuidance,
    directoryShellClassName,
    setShellMode,
    handleDirectoryCollapsedChange,
  } = ui

  const proseEditorRef = useRef<EditorView | null>(null)

  const {
    loading,
    selectedProject,
    setSelectedProject,
    worldbuilding,
    characters,
    outlines,
    chapters,
    setChapters,
    runRecords,
    reviews,
    agentExecution,
    setAgentExecution,
    pipeline,
    models,
    selectedModelId,
    setSelectedModelId,
    activeChapterId,
    setActiveChapterId,
    activeChapter,
    loadProjectModules,
    chapterTreeData,
    proseChapters,
    referenceSummary,
    referenceReports,
    isEmptyProject,
    sortedChapters,
    filteredChapters,
  } = useNovelWorkspaceData({
    projectId,
    chapterSearch,
    chapterStatusFilter,
    chapterSortMode,
  })

  const activeChapterIdNumber = Number(activeChapter?.id || 0)
  const activeChapterUpdatedAt = activeChapter?.updated_at || null
  const activeChapterDiagnosticsData = resolveActiveChapterOwnedData(activeChapterDiagnostics, activeChapterIdNumber, activeChapterUpdatedAt)
  const activeContextPackageData = resolveActiveChapterOwnedData(activeChapterContextPackage, activeChapterIdNumber, activeChapterUpdatedAt)
  const modelOptions = useMemo(() => models.map((model: any) => {
    const modelName = String(model.display_name || model.model_name || '未命名模型')
    const providerName = String(model.provider || '未知厂商')
    const fullLabel = `${modelName} · ${providerName}`
    return {
      value: model.id,
      label: (
        <span className="novel-model-option" title={fullLabel}>
          <span className="novel-model-option-name">{modelName}</span>
          <span className="novel-model-option-provider">· {providerName}</span>
        </span>
      ),
    }
  }), [models])
  const activeMemorySummary = useMemo(
    () => resolveActiveMemorySummary(memoryPalaceProjects, projectId),
    [memoryPalaceProjects, projectId],
  )

  useEffect(() => {
    if (!projectId) return
    if (workspaceArea !== 'autoCreation' && workspaceArea !== 'storyPlanning' && workspaceArea !== 'storyAssets') return
    let canceled = false
    apiClient.get(`/novel/projects/${projectId}/settings`)
      .then(res => {
        if (canceled) return
        setProjectSettings(Array.isArray(res.data?.items) ? res.data.items : [])
      })
      .catch(() => {
        if (!canceled) setProjectSettings([])
      })
    return () => {
      canceled = true
    }
  }, [projectId, reviews.length, workspaceArea])

  useEffect(() => {
    if (!projectId) return
    let canceled = false
    apiClient.get('/novel/memory-palace/projects')
      .then(res => {
        if (canceled) return
        setMemoryPalaceProjects(Array.isArray(res.data?.projects) ? res.data.projects : [])
      })
      .catch(() => {
        if (!canceled) setMemoryPalaceProjects([])
      })
    return () => {
      canceled = true
    }
  }, [projectId, runRecords.length, reviews.length, sortedChapters.length])

  const proseQualityReports = useMemo(() => filterReviewsByType(reviews, 'prose_quality'), [reviews])
  const editorReports = useMemo(() => filterReviewsByType(reviews, 'editor_report'), [reviews])
  const editorRevisionReports = useMemo(() => filterReviewsByType(reviews, 'editor_revision'), [reviews])
  const bookReviews = useMemo(() => filterReviewsByType(reviews, 'book_review'), [reviews])

  const cancelStepGenerateProse = () => {
    if (!stepProseLoading) return
    proseBatchCancelRef.current = true
    setProseBatchStatus((prev: any) => ({
      ...(prev || {}),
      canceled: true,
      lastError: '已请求停止，当前章节完成后停止后续生成',
    }))
    message.info('已请求停止批量生成，当前章节完成后会停止后续章节')
  }

  // ── auto-save state ──
  const {
    saveStatus,
    scheduleSave,
    flushPendingSave,
    selectChapter,
  } = useChapterAutosave({
    activeChapterId,
    resetKey: projectId,
    setActiveChapterId,
    setChapters,
  })

  const selectChapterForWriting = async (chapterId: number) => {
    const saved = await selectChapter(chapterId)
    if (saved) setWorkspaceArea('chapterWriting')
    return saved
  }

  const openStoryAssetsWorkspace = (focus?: 'discoveredAssets') => {
    setWorkspaceArea('storyAssets')
    if (focus === 'discoveredAssets') {
      setStoryAssetsFocusDiscoveredToken(prev => prev + 1)
    }
  }

  const {
    activeTasks,
    activeKnowledgeJobCount,
    productionTasks,
    productionTasksLoading,
    loadProductionTasks,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    pauseKnowledgeIngestJob,
    resumeKnowledgeIngestJob,
    cancelKnowledgeIngestJob,
  } = useWorkspaceTasks({
    projectId,
    taskCenterOpen,
    selectedModelId,
    stepOutlineLoading,
    stepProseLoading,
    stepRepairLoading,
    proseProgress,
    proseBatchStatus,
    planning,
    planProgress,
    executingAgents,
    generatingProse,
    streamingProgress,
    streamingPercent,
    activeChapter,
    onCancelProseBatch: cancelStepGenerateProse,
  })

  useEffect(() => {
    if (!projectId || workspaceArea !== 'storyPlanning') return
    void loadProductionTasks()
  }, [projectId, workspaceArea, loadProductionTasks])

  const {
    planningWorkspaceModel,
    writingCockpitModel,
    autoCreationDirectorModel,
    serialPipelineModel,
    recentFatigueRollingPlanIntent,
    autoDirectorBusy,
    findReviewById,
    latestCockpitEditorReport,
    latestCockpitQualityReport,
  } = useNovelWorkspaceDomainModels({
    selectedProject,
    outlines,
    sortedChapters,
    activeChapter,
    activeChapterDiagnosticsData,
    commercialReadiness,
    reviews,
    projectSettings,
    productionTasks,
    activeContextPackageData,
    activeTasks,
    runRecords,
    activeMemorySummary,
    selectedModelId,
    styleSampleEffectiveness,
    pipeline,
    projectId,
    setStyleSampleEffectiveness,
    stepProseLoading,
    generatingProse,
    generatingSceneCards,
    diagnosticsLoading,
    contextPackageLoading,
    editorReportLoading,
    proseQualityLoading,
    commercialToolLoading,
    setAutoDirectorActionLoadingKey,
  })

  const {
    loadActiveChapterContextPackage,
  } = useNovelWorkspaceChapterLoads({
    activeChapter,
    projectId,
    selectedProject,
    chapters,
    outlines,
    characters,
    runRecords,
    reviews,
    diagnosticsRequestRef,
    contextPackageRequestRef,
    setActiveChapterDiagnostics,
    setActiveChapterContextPackage,
    setContextPackageLoading,
    setCommercialReadiness,
  })

  // ── diff toggle ──
  const [showOnlyDiff, setShowOnlyDiff] = useState(true)

  /* ── selected chapters (resolved to objects) ────────────────────── */
  const selectedChaptersList = useMemo(() =>
    chapters.filter(ch => selectedChapterIds.has(ch.id)),
    [chapters, selectedChapterIds],
  )

  const {
    chapterVersions,
    chapterVersionsLoading,
    chapterVersionDetail,
    rollingBackVersionId,
    setChapterVersionDetail,
    rollbackChapterVersion,
  } = useChapterVersions({
    activeChapter,
    flushPendingSave,
    reloadProject: loadProjectModules,
  })

  const { confirmReferenceReady } = useReferenceWorkflow({
    projectId,
    referenceSummary,
    onNeedConfig: () => setReferenceConfigOpen(true),
  })

  const coreHandlers = bindNovelWorkspaceCoreHandlers({
    activeChapter,
    activeChapterId,
    agentConfigForm,
    apiClient,
    approvalPolicyForm,
    autoCreationDirectorModel,
    backupImportText,
    chapterHasProse,
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

  })
  const {
    applyEditorRevision,
    createDeliveryRiskRepairQueue,
    createEditorReport,
    createEditorReportForChapter,
    createFirst30RetentionRepairQueue,
    createReaderTrialRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createStyleSampleBatchRepairQueue,
    extractStyleSampleCandidates,
    fillDefaultStyleSampleBank,
    generateCurrentChapterProse,
    generateSceneCardsForActiveChapter,
    generateSceneCardsForChapter,
    generateWritingBibleEditor,
    openChapterQualityCard,
    openContinuityAudit,
    openGenerationDiagnostics,
    openLongformProductionTrends,
    openStoryStateEditor,
    openWritingBibleEditor,
    previewStyleSampleAdjustmentBatch,
    previewStyleSampleAdjustmentPatch,
    refreshActiveProseQuality,
    repairContextAndGenerateCurrentChapter,
    reviewStyleSampleAdjustmentPatch,
    runBookReview,
    runRollingPlan,
    saveStoryStateEditor,
    saveWritingBibleEditor,
    stepGenerateProse,
    syncStoryStateForChapter,
    undoStyleSampleAdjustmentPatch,
  } = coreHandlers

  /* ── streaming scroll ──────────────────────────────────────────── */
  useEffect(() => {
    if (streamingChapterId) streamingEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [streamingText, streamingChapterId])

  /* ── render ────────────────────────────────────────────────────── */
  if (loading && !selectedProject) {
    return {
      status: 'loading' as const,
    }
  }

  return {
    status: 'base' as const,
    activeChapter,
    activeChapterDiagnosticsData,
    activeChapterId,
    activeContextPackageData,
    activeKnowledgeJobCount,
    activeTasks,
    agentAuditOpen,
    agentExecution,
    applyEditorRevision,
    autoCreationDirectorModel,
    autoDirectorActionLoadingKey,
    backupImportOpen,
    backupImportText,
    bookReviewLoading,
    bookReviews,
    cancelKnowledgeIngestJob,
    chapterDrawerOpen,
    chapterGroupExecutingId,
    chapterSearch,
    chapterSortMode,
    chapterStatusFilter,
    chapterTargetWordCount,
    chapterTreeData,
    chapterVersionDetail,
    chapterVersions,
    chapterVersionsLoading,
    chapterWordTargetMode,
    chapters,
    characters,
    commercialReadiness,
    commercialToolLoading,
    commercialToolsOpen,
    consistencyGraphOpen,
    contextPackage: activeContextPackageData,
    contextPackageLoading,
    continuityAudit,
    continuityAuditLoading,
    coreHandlers,
    createDeliveryRiskRepairQueue,
    createEditorReport,
    createEditorReportForChapter,
    createFirst30RetentionRepairQueue,
    createReaderTrialRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createStyleSampleBatchRepairQueue,
    creativeAssistantError,
    creativeAssistantLoading,
    creativeAssistantMode,
    creativeAssistantOpen,
    creativeAssistantResult,
    creativeAssistantSelectedText,
    creativeCardsOpen,
    creativeCommandOpen,
    creativeCommandPlan,
    creativeCommandText,
    dashboardLoading,
    diagnosticsLoading,
    directoryCollapsed,
    directoryShellClassName,
    editorForm,
    editorKind,
    editorReportLoading,
    editorReports,
    editorRevisionReports,
    exportDeliveryOpen,
    extractStyleSampleCandidates,
    fillDefaultStyleSampleBank,
    filteredChapters,
    flushPendingSave,
    future100ApplyLoading,
    future100Draft,
    future100SelectedNos,
    future100FocusOutlineIds,
    generateCurrentChapterProse,
    generateSceneCardsForActiveChapter,
    generateSceneCardsForChapter,
    generateWritingBibleEditor,
    generatingProse,
    generatingSceneCards,
    generationPipeline,
    handleDirectoryCollapsedChange,
    id,
    incubatingOriginal,
    isEmptyProject,
    isImmersiveShell,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    loadProductionTasks,
    loading,
    loadProjectModules,
    modelOptions,
    navigate,
    openChapterQualityCard,
    openContinuityAudit,
    openGenerationDiagnostics,
    openLongformProductionTrends,
    openStoryAssetsWorkspace,
    openStoryStateEditor,
    openWritingBibleEditor,
    outlinePanelOpen,
    outlineTreeOpen,
    outlines,
    pauseKnowledgeIngestJob,
    pipelineLoading,
    planning,
    planningWorkspaceModel,
    previewStyleSampleAdjustmentBatch,
    previewStyleSampleAdjustmentPatch,
    productionMode,
    productionModeOptions,
    productionTasks,
    productionTasksLoading,
    projectId,
    projectSettings,
    proseChapters,
    proseEditorRef,
    proseProgress,
    proseQualityLoading,
    proseQualityReports,
    qualityBenchmarkOpen,
    recentFatigueRollingPlanIntent,
    referenceConfigOpen,
    referenceEngineeringOpen,
    referenceReports,
    referenceSummary,
    refreshActiveProseQuality,
    releaseRepairExecutingId,
    repairContextAndGenerateCurrentChapter,
    restructurePanelOpen,
    resumeKnowledgeIngestJob,
    reviewAnnotationsOpen,
    reviewStyleSampleAdjustmentPatch,
    reviews,
    rightPanelOpen,
    rightPanelTab,
    rollbackChapterVersion,
    rollingBackVersionId,
    runBookReview,
    runRecords,
    runRollingPlan,
    saveStatus,
    saveStoryStateEditor,
    saveWritingBibleEditor,
    scheduleSave,
    selectChapterForWriting,
    selectMode,
    selectedChapterIds,
    selectedChaptersList,
    selectedModelId,
    selectedProject,
    serialPipelineModel,
    setAgentAuditOpen,
    setAgentExecution,
    setAutoDirectorActionLoadingKey,
    setBackupImportOpen,
    setBackupImportText,
    setChapterDrawerOpen,
    setChapterSearch,
    setChapterSortMode,
    setChapterStatusFilter,
    setChapterTargetWordCount,
    setChapterVersionDetail,
    setChapterWordTargetMode,
    setChapters,
    setCommercialToolsOpen,
    setConsistencyGraphOpen,
    setCreativeAssistantMode,
    setCreativeAssistantOpen,
    setCreativeCardsOpen,
    setCreativeCommandOpen,
    setCreativeCommandText,
    setEditorItem,
    setEditorKind,
    setExportDeliveryOpen,
    setFuture100Draft,
    setFuture100FocusOutlineIds,
    setFuture100SelectedNos,
    setOutlinePanelOpen,
    setOutlineTreeOpen,
    setProductionMode,
    setQualityBenchmarkOpen,
    setReferenceConfigOpen,
    setReferenceEngineeringOpen,
    setRestructurePanelOpen,
    setReviewAnnotationsOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectMode,
    setSelectedChapterIds,
    setSelectedModelId,
    setSelectedProject,
    setShellMode,
    setShowOnlyDiff,
    setStoryStateOpen,
    setTaskCenterOpen,
    setTaskCenterRecoveryFocus,
    setUnattendedTargetChapter,
    setWorkspaceArea,
    setWritingBibleOpen,
    showGlobalWritingGuidance,
    showOnlyDiff,
    sortedChapters,
    stepGenerateProse,
    stepProseLoading,
    storyAssetsFocusDiscoveredToken,
    storyStateForm,
    storyStateOpen,
    streamingChapterId,
    streamingEndRef,
    streamingPercent,
    streamingProgress,
    streamingText,
    styleSampleCandidateLoading,
    styleSampleEffectiveness,
    styleSampleEffectivenessItems,
    styleSampleEffectivenessLoading,
    styleSamplePatchLoadingKey,
    syncStoryStateForChapter,
    taskCenterOpen,
    taskCenterRecoveryFocus,
    unattendedTargetChapter,
    undoStyleSampleAdjustmentPatch,
    workspaceArea,
    worldbuilding,
    writingBibleForm,
    writingBibleGenerating,
    writingBibleOpen,
    writingCockpitModel,
  }
}
