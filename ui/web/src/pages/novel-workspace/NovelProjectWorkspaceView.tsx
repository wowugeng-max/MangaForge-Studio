import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Progress,
  Select,
  Space,
  Typography,
  Tooltip,
  Tag,
} from 'antd'
import {
  ArrowLeftOutlined,
  BookOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  ControlOutlined,
  DatabaseOutlined,
  EditOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MoreOutlined,
  ReloadOutlined,
  RocketOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { EditorView } from '@codemirror/view'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import apiClient from '../../api/client'
import {
  generateClientId,
  type SSEMessage,
} from '../../utils/sse'
import {
  ChapterDirectorySidebar,
} from './ChapterDirectorySidebar'
import {
  CreativeAssistantPanel,
} from './CreativeAssistantPanel'
import type { EditorKind } from './EditorModal'
import {
  ReferencePanel,
} from './ReferencePanel'
import {
  StoryAssetsWorkspace,
} from './StoryAssetsWorkspace'
import {
  StoryPlanningWorkspace,
  type PlanningLoadingKey,
} from './StoryPlanningWorkspace'
import {
  WritingCockpitPanel,
} from './WritingCockpitPanel'
import {
  WorkspaceCenter,
} from './WorkspaceCenter'
import {
  buildAutoCreationDirectorModel,
  type AutoCreationDirectorAction,
} from './autoCreationDirectorModel'
import {
  buildPlanningWorkspaceModel,
  type PlanningActionKey,
} from './planningWorkspaceModel'
import {
  buildWritingCockpitModel,
  resolveEditorRevisionChapterId,
  selectTargetChapterForWriting,
  type WritingCockpitActionKey,
} from './writingCockpitModel'
import {
  type CreativeAssistCard,
  type CreativeAssistResult,
  type CreativeAssistantModeKey,
} from './creativeAssistantModel'
import {
  useChapterAutosave,
} from './useChapterAutosave'
import {
  useChapterVersions,
} from './useChapterVersions'
import {
  useNovelWorkspaceData,
  type ChapterSortMode,
  type ChapterStatusFilter,
} from './useNovelWorkspaceData'
import type { SafeBatchRecoveryFocusSnapshot } from './TaskCenterDrawer'
import {
  useReferenceWorkflow,
} from './useReferenceWorkflow'
import {
  useWorkspaceTasks,
} from './useWorkspaceTasks'
import {
  chapterHasProse,
  displayValue,
  wc,
} from './utils'
import {
  buildSerialPipelineViewModel,
} from './serialPipelineModel'
import {
  immersiveEnterPanelDefaults,
  isImmersiveShell as deriveIsImmersiveShell,
  loadWorkbenchDirectoryCollapsed,
  loadWorkspaceShellMode,
  rootShellClassName,
  saveWorkbenchDirectoryCollapsed,
  saveWorkspaceShellMode,
  shellModeForWorkspaceArea,
  type WorkspaceShellMode,
} from './workspaceShellModel'
import {
  DeferredWorkspaceSurfaces,
  buildRecoveryEvidenceQueueRecheckTask,
  formatRunResumeErrorMessage,
  formatStoryStateSyncFailure,
  safeBatchRecoveryFocusFromPayload,
} from './shell/workspace-helpers'
import {
  renderGenerationResultDiffContentView,
} from './shell/workspace-commercial-result'
import {
  NovelWorkspaceTopBar,
} from './shell/workspace-topbar'
import {
  NovelWorkspaceDeferredSurfaces,
} from './shell/workspace-deferred-surfaces'
import {
  NovelWorkspaceBody,
} from './shell/workspace-body'
import {
  buildNovelWorkspaceAreaViewProps,
  buildNovelWorkspaceBodyProps,
  buildNovelWorkspaceDeferredSurfacesProps,
  buildNovelWorkspaceTopBarProps,
} from './shell/workspace-view-props'
import {
  buildWorkspaceWritingRecommendation,
  filterReviewsByType,
  resolveActiveChapterOwnedData,
  resolveActiveChapterSceneCards,
  resolveActiveMemorySummary,
} from './shell/workspace-derived-state'
import {
  AgentAuditDrawer,
  AgentExecutionModal,
  AutoCreationDirectorWorkspace,
  ChapterManagementDrawer,
  ChapterRestructurePanel,
  ConsistencyGraphModal,
  CreativeCardsModal,
  EditorModal,
  ExportDeliveryModal,
  OutlineControlPanel,
  OutlineTreeModal,
  QualityBenchmarkModal,
  ReferenceConfigModal,
  ReferenceEngineeringModal,
  ReviewAnnotationsDrawer,
  TaskCenterDrawer,
  VersionDetailModal,
} from './shell/workspace-lazy'
import {
  productionModeOptions,
  type ChapterOwnedData,
  type ChapterWordTargetMode,
  type WorkspaceArea,
} from './shell/workspace-types'
import {
  bindNovelWorkspaceActionHandlers,
} from './shell/workspace-view-bind-action-handlers'
import {
  buildWorkspaceCockpitPrimaryActionOverride,
} from './shell/workspace-cockpit-primary-override'
import {
  bindNovelWorkspaceCoreHandlers,
} from './shell/workspace-view-bind-core-handlers'
import '../NovelProjectWorkspace.css'

type AnyRecord = Record<string, any>

const { Title, Text, Paragraph } = Typography

export default function NovelProjectWorkspace() {
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

  const planningWorkspaceModel = useMemo(() => buildPlanningWorkspaceModel({
    selectedProject,
    outlines,
    chapters: sortedChapters,
    activeChapter,
    materialScore: activeChapterDiagnosticsData?.material_score,
    commercialReadiness,
    reviews,
    settingEntities: projectSettings,
    productionTasks,
  }), [selectedProject, outlines, sortedChapters, activeChapter, activeChapterDiagnosticsData?.material_score, commercialReadiness, reviews, projectSettings, productionTasks])

  const writingCockpitModel = useMemo(() => buildWritingCockpitModel({
    project: selectedProject,
    chapters: sortedChapters,
    outlines,
    activeChapter,
    contextPackage: activeContextPackageData,
    diagnostics: activeChapterDiagnosticsData,
    materialScore: activeChapterDiagnosticsData?.material_score || null,
    commercialReadiness,
    activeRuns: [...activeTasks, ...runRecords],
    reviews,
    memorySummary: activeMemorySummary,
  }), [
    selectedProject,
    sortedChapters,
    outlines,
    activeChapter,
    activeContextPackageData,
    activeChapterDiagnosticsData,
    commercialReadiness,
    activeTasks,
    runRecords,
    reviews,
    activeMemorySummary,
  ])

  const autoCreationDirectorModel = useMemo(() => buildAutoCreationDirectorModel({
    planning: planningWorkspaceModel,
    writing: writingCockpitModel,
    activeTasks,
    selectedModelId,
    reviews,
    runRecords,
    chapters: sortedChapters,
    storyState: selectedProject?.reference_config?.story_state || {},
    styleSampleEffectiveness,
  }), [planningWorkspaceModel, writingCockpitModel, activeTasks, selectedModelId, reviews, runRecords, sortedChapters, selectedProject?.reference_config?.story_state, styleSampleEffectiveness])
  const serialPipelineModel = useMemo(() => buildSerialPipelineViewModel(pipeline), [pipeline])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`)
      .then(res => {
        if (!cancelled) {
          setStyleSampleEffectiveness(res.data?.style_sample_effectiveness || res.data?.report || null)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [projectId, selectedProject?.updated_at, reviews.length, sortedChapters.length])

  const recentFatigueRollingPlanIntent = useMemo(() => {
    const fatigue = planningWorkspaceModel.recentFatigueRadar
    const fatigueWarnings = Array.isArray(fatigue?.signals)
      ? fatigue.signals.filter((signal: any) => String(signal?.status || '') === 'warn')
      : []
    if (fatigue?.status !== 'needs_attention' && fatigueWarnings.length === 0) return null
    return {
      source: 'recent_fatigue_repair',
      recent_fatigue_radar: fatigue,
    }
  }, [planningWorkspaceModel.recentFatigueRadar])

  const autoDirectorBusy = Boolean(
    stepProseLoading
    || generatingProse
    || generatingSceneCards
    || diagnosticsLoading
    || contextPackageLoading
    || editorReportLoading
    || proseQualityLoading
    || commercialToolLoading,
  )

  useEffect(() => {
    if (!autoDirectorBusy) setAutoDirectorActionLoadingKey('')
  }, [autoDirectorBusy])

  const findReviewById = (reviewId: any) => (
    reviews.find((review: any) => String(review.id) === String(reviewId)) || null
  )

  const latestCockpitEditorReport = () => {
    const reviewId = writingCockpitModel.chapterAcceptanceDesk.latestEditorReportId
    return reviewId ? findReviewById(reviewId) : null
  }

  const latestCockpitQualityReport = () => {
    const reviewId = writingCockpitModel.chapterAcceptanceDesk.latestQualityReviewId
    return reviewId ? findReviewById(reviewId) : null
  }

  useEffect(() => {
    const loadDiagnostics = async () => {
      const chapterId = Number(activeChapter?.id || 0)
      const updatedAt = activeChapter?.updated_at || null
      if (!chapterId || !projectId) {
        diagnosticsRequestRef.current += 1
        setActiveChapterDiagnostics(null)
        return
      }
      const requestId = ++diagnosticsRequestRef.current
      try {
        const res = await apiClient.get(`/novel/chapters/${chapterId}/generation-diagnostics`, { params: { project_id: projectId } })
        if (diagnosticsRequestRef.current !== requestId) return
        setActiveChapterDiagnostics({ chapterId, updatedAt, data: res.data || null })
      } catch {
        if (diagnosticsRequestRef.current === requestId) setActiveChapterDiagnostics(null)
      }
    }
    void loadDiagnostics()
  }, [activeChapter?.id, activeChapter?.updated_at, projectId])

  const loadActiveChapterContextPackage = useCallback(async (options: { silent?: boolean; chapterId?: number; updatedAt?: any } = {}) => {
    const chapterId = Number(options.chapterId || activeChapter?.id || 0)
    const updatedAt = options.updatedAt !== undefined
      ? options.updatedAt
      : (chapterId === Number(activeChapter?.id || 0) ? activeChapter?.updated_at || null : null)
    if (!chapterId || !projectId) {
      contextPackageRequestRef.current += 1
      setActiveChapterContextPackage(null)
      setContextPackageLoading(false)
      return null
    }
    const requestId = ++contextPackageRequestRef.current
    setContextPackageLoading(true)
    setActiveChapterContextPackage(prev => (
      prev?.chapterId === chapterId && prev?.updatedAt === updatedAt ? prev : null
    ))
    try {
      const res = await apiClient.get(`/novel/chapters/${chapterId}/context-package`, {
        params: { project_id: projectId },
      })
      if (contextPackageRequestRef.current !== requestId) return null
      setActiveChapterContextPackage({ chapterId, updatedAt, data: res.data || null })
      if (!options.silent) message.success('上下文包已刷新')
      return res.data || null
    } catch (error: any) {
      if (contextPackageRequestRef.current !== requestId) return null
      setActiveChapterContextPackage(null)
      if (!options.silent) message.error(error?.response?.data?.error || error?.message || '上下文包加载失败')
      return null
    } finally {
      if (contextPackageRequestRef.current === requestId) setContextPackageLoading(false)
    }
  }, [activeChapter?.id, activeChapter?.updated_at, projectId])

  useEffect(() => {
    const chapterId = Number(activeChapter?.id || 0)
    if (!chapterId) {
      void loadActiveChapterContextPackage({ silent: true, chapterId: 0 })
      return
    }
    void loadActiveChapterContextPackage({ silent: true, chapterId, updatedAt: activeChapter?.updated_at || null })
  }, [activeChapter?.id, activeChapter?.updated_at, projectId, loadActiveChapterContextPackage])

  useEffect(() => {
    let canceled = false
    const loadCommercialReadiness = async () => {
      if (!projectId || !selectedProject) {
        setCommercialReadiness(null)
        return
      }
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/commercial-readiness`)
        if (!canceled) setCommercialReadiness(res.data?.readiness || null)
      } catch {
        if (!canceled) setCommercialReadiness(null)
      }
    }
    void loadCommercialReadiness()
    return () => { canceled = true }
  }, [projectId, selectedProject?.updated_at, chapters.length, outlines.length, characters.length, runRecords.length, reviews.length])

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
    openStoryStateEditor,
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
    sortedChapters,
    unattendedTargetChapter,
    worldbuilding,

  })
  const {
    acceptChapterVersion,
    applyEditorRevision,
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
  } = coreHandlers

  /* ── streaming scroll ──────────────────────────────────────────── */
  useEffect(() => {
    if (streamingChapterId) streamingEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [streamingText, streamingChapterId])

  /* ── render ────────────────────────────────────────────────────── */
  if (loading && !selectedProject) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><ReloadOutlined className="anticon" style={{ fontSize: 24, animation: 'spin 1s linear infinite' }} /> 加载中…</div>
  }

  const planningLoadingKey = ((): PlanningLoadingKey | undefined => {
    const keys: PlanningLoadingKey[] = ['rollingPlan', 'future100Audit', 'future100Generate', 'longformPressure', 'longformCreationDiagnosis', 'topic', 'referenceDiagnosis', 'first30Retention', 'first30Repair', 'readerTrial', 'readerTrialRepair']
    return keys.includes(commercialToolLoading as PlanningLoadingKey) ? commercialToolLoading as PlanningLoadingKey : undefined
  })()
  const workspaceAreaTabs: Array<{ key: WorkspaceArea; label: string; icon: React.ReactNode }> = [
    { key: 'autoCreation', label: '自动创作', icon: <ControlOutlined /> },
    { key: 'storyPlanning', label: '故事规划', icon: <BookOutlined /> },
    { key: 'chapterWriting', label: '章节写作', icon: <EditOutlined /> },
    { key: 'storyAssets', label: '设定资产', icon: <DatabaseOutlined /> },
    { key: 'qualityRevision', label: '质检修订', icon: <SafetyOutlined /> },
    { key: 'productionOps', label: '生产运营', icon: <RocketOutlined /> },
  ]

  const actionHandlers = bindNovelWorkspaceActionHandlers({
    activeChapter,
    activeChapterId,
    apiClient,
    applyEditorRevision,
    autoCreationDirectorModel,
    chapterHasProse,
    chapters,
    createDeliveryRiskRepairQueue,
    createEditorReport,
    createEditorReportForChapter,
    createFirst30RetentionRepairQueue,
    createReaderTrialRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createStyleSampleBatchRepairQueue,
    generateCurrentChapterProse,
    generateSceneCardsForChapter,
    loadProductionTasks,
    loadProjectModules,
    openChapterQualityCard,
    openContinuityAudit,
    openGenerationDiagnostics,
    openLongformProductionTrends,
    openStoryAssetsWorkspace,
    openStoryStateEditor,
    openWritingBibleEditor,
    projectId,
    recentFatigueRollingPlanIntent,
    refreshActiveProseQuality,
    runRecords,
    runRollingPlan,
    selectChapterForWriting,
    selectTargetChapterForWriting,
    serialPipelineModel,
    setAutoDirectorActionLoadingKey,
    setOutlinePanelOpen,
    setOutlineTreeOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setTaskCenterOpen,
    setWorkspaceArea,
    sortedChapters,
    stepGenerateProse,
    syncStoryStateForChapter,
    writingCockpitModel,
  })
  const {
    acceptCockpitChapterAndContinue,
    createStorylineDecisionTasks,
    handleAutoCreationDirectorAction,
    handlePlanningAction,
    handleSerialPipelineAction,
    handleWritingCockpitAction,
    recordStorylineDiffDecision,
    runAutoCreationRepairAction,
    runAutoCreationRepairPlan,
  } = actionHandlers

  const renderSerialPipeline = () => (
    <SerialPipelineStrip model={serialPipelineModel} />
  )

  const activeChapterSceneCards = resolveActiveChapterSceneCards(activeChapter)

  const writingRecommendation = buildWorkspaceWritingRecommendation({
    activeChapterDiagnosticsData,
    activeChapterSceneCards,
    activeChapter,
    writingCockpitModel,
  })

  const cockpitPrimaryActionOverride = buildWorkspaceCockpitPrimaryActionOverride({
    activeChapter,
    workspaceArea,
    writingRecommendation,
    openGenerationDiagnostics,
    generateSceneCardsForActiveChapter,
    repairContextAndGenerateCurrentChapter,
    generateCurrentChapterProse,
    openChapterQualityCard,
  })

  const workspaceViewDeps = {
    ...coreHandlers,
    ...actionHandlers,
    activeChapter,
    activeChapterDiagnosticsData,
    activeChapterId,
    activeContextPackageData,
    activeKnowledgeJobCount,
    activeTasks,
    agentAuditOpen,
    agentExecution,
    autoCreationDirectorModel,
    autoDirectorActionLoadingKey,
    backupImportOpen,
    backupImportText,
    bookReviewLoading,
    bookReviews,
    cancelKnowledgeIngestJob,
    chapterDrawerOpen,
    chapterGroupExecutingId,
    chapterId,
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
    cockpitPrimaryActionOverride,
    commercialReadiness,
    commercialToolLoading,
    commercialToolsOpen,
    consistencyGraphOpen,
    contextPackage,
    contextPackageLoading,
    continuityAudit,
    continuityAuditLoading,
    creativeAssistantError,
    creativeAssistantLoading,
    creativeAssistantMode,
    creativeAssistantOpen,
    creativeAssistantResult,
    creativeAssistantSelectedText,
    creativeCardsOpen,
    creativeCommandOpen,
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
    future100FocusOutlineIds,
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
    loadProjectModules,
    modelOptions,
    navigate,
    openStoryAssetsWorkspace,
    openStoryStateEditor,
    openWritingBibleEditor,
    outlinePanelOpen,
    outlineTreeOpen,
    outlines,
    pauseKnowledgeIngestJob,
    pipelineLoading,
    planning,
    planningLoadingKey,
    planningWorkspaceModel,
    previewStyleSampleAdjustmentBatch,
    previewStyleSampleAdjustmentPatch,
    productionMode,
    productionModeOptions,
    productionTasks,
    projectId,
    projectSettings,
    proseChapters,
    proseEditorRef,
    proseProgress,
    proseQualityLoading,
    proseQualityReports,
    qualityBenchmarkOpen,
    referenceConfigOpen,
    referenceEngineeringOpen,
    referenceReports,
    referenceSummary,
    releaseRepairExecutingId,
    renderSerialPipeline,
    renderWorkspaceArea,
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
    setAgentAuditOpen,
    setAgentExecution,
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
    taskCenterOpen,
    taskCenterRecoveryFocus,
    unattendedTargetChapter,
    undoStyleSampleAdjustmentPatch,
    workspaceArea,
    workspaceAreaTabs,
    worldbuilding,
    writingBibleForm,
    writingBibleGenerating,
    writingBibleOpen,
    writingCockpitModel,
    writingRecommendation,
  }

  const renderWorkspaceArea = () => (
    <NovelWorkspaceAreaView {...buildNovelWorkspaceAreaViewProps(workspaceViewDeps)} />
  )

  return (
    <div
      className={`novel-project-workspace ${rootShellClassName(isImmersiveShell)}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: '#fff' }}
    >

      <NovelWorkspaceTopBar {...buildNovelWorkspaceTopBarProps(workspaceViewDeps)} />

      <NovelWorkspaceBody {...buildNovelWorkspaceBodyProps(workspaceViewDeps)} />
      <NovelWorkspaceDeferredSurfaces {...buildNovelWorkspaceDeferredSurfacesProps(workspaceViewDeps)} />

    </div>
  )
}
