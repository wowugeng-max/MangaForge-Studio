import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, Badge, Button, Card, Checkbox, Dropdown, Form, Input, InputNumber, List, message, Modal, Progress, Select, Space, Typography, Tooltip, Tag,
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
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../../api/client'
import { createSSEClient, generateClientId, type SSEMessage } from '../../utils/sse'
import { ChapterDirectorySidebar } from './ChapterDirectorySidebar'
import { CreativeAssistantPanel } from './CreativeAssistantPanel'
import type { EditorKind } from './EditorModal'
import { ReferencePanel } from './ReferencePanel'
import { StoryAssetsWorkspace } from './StoryAssetsWorkspace'
import { StoryPlanningWorkspace, type PlanningLoadingKey } from './StoryPlanningWorkspace'
import { WritingCockpitPanel, type WritingCockpitPrimaryActionOverride } from './WritingCockpitPanel'
import { WorkspaceCenter } from './WorkspaceCenter'
import {
  buildAutoCreationDirectorModel,
  type AutoCreationDirectorAction,
} from './autoCreationDirectorModel'
import { buildNovelWritingRecommendation } from './writingRecommendationModel'
import { buildPlanningWorkspaceModel, type PlanningActionKey } from './planningWorkspaceModel'
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
import { useChapterAutosave } from './useChapterAutosave'
import { useChapterVersions } from './useChapterVersions'
import { useNovelWorkspaceData, type ChapterSortMode, type ChapterStatusFilter } from './useNovelWorkspaceData'
import type { SafeBatchRecoveryFocusSnapshot } from './TaskCenterDrawer'
import { useReferenceWorkflow } from './useReferenceWorkflow'
import { useWorkspaceTasks } from './useWorkspaceTasks'
import {
  chapterHasProse,
  chapterWordCount,
  displayValue,
  wc,
} from './utils'
import { buildSerialPipelineViewModel } from './serialPipelineModel'
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
import { NovelWorkspaceTopBar } from './shell/workspace-topbar'
import { NovelWorkspaceDeferredSurfaces } from './shell/workspace-deferred-surfaces'
import { NovelWorkspaceBody } from './shell/workspace-body'
import { createCommercialToolHandlers } from './shell/workspace-commercial-tools'
import { createPreflightHandlers } from './shell/workspace-preflight-handlers'
import { createRepairTaskHandlers } from './shell/workspace-repair-task-handlers'
import {
  buildNovelWorkspaceAreaViewProps,
  buildNovelWorkspaceBodyProps,
  buildNovelWorkspaceDeferredSurfacesProps,
  buildNovelWorkspaceTopBarProps,
} from './shell/workspace-view-props'
import { createWorkspaceActionHandlers } from './shell/workspace-action-handlers'
import { createChapterProseHandlers } from './shell/workspace-chapter-prose-handlers'
import { createChapterVersionHandlers, createProjectAssetDeleteHandlers, createSceneCardHandlers, createStorylineDecisionHandlers } from './shell/workspace-chapter-version-handlers'
import { createWritingBibleHandlers } from './shell/workspace-writing-bible-handlers'
import { createPlanningHandlers } from './shell/workspace-planning-handlers'
import { createProductionHandlers } from './shell/workspace-production-handlers'
import { createEditorHandlers } from './shell/workspace-editor-handlers'
import { createEditorReportHandlers } from './shell/workspace-editor-report-handlers'
import { createRunQueueHandlers } from './shell/workspace-run-queue-handlers'
import { createChapterPrepHandlers } from './shell/workspace-chapter-prep-handlers'
import { createDiagnosticsHandlers } from './shell/workspace-diagnostics-handlers'
import { createCreativeHandlers } from './shell/workspace-creative-handlers'
import { createStyleSampleHandlers } from './shell/workspace-style-sample-handlers'
import { createWritingQueueHandlers } from './shell/workspace-writing-queue-handlers'
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
  const activeChapterDiagnosticsData = activeChapterDiagnostics?.chapterId === activeChapterIdNumber
    && activeChapterDiagnostics?.updatedAt === activeChapterUpdatedAt
    ? activeChapterDiagnostics.data
    : null
  const activeContextPackageData = activeChapterContextPackage?.chapterId === activeChapterIdNumber
    && activeChapterContextPackage?.updatedAt === activeChapterUpdatedAt
    ? activeChapterContextPackage.data
    : null
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
  const activeMemorySummary = useMemo(() => {
    if (!projectId) return null
    if (!Array.isArray(memoryPalaceProjects)) return null
    return memoryPalaceProjects.find((item: any) => Number(item?.project_id || 0) === projectId) || {
      project_id: projectId,
      memory_count: 0,
      fact_count: 0,
      continuity_issue_count: 0,
      missing: true,
    }
  }, [memoryPalaceProjects, projectId])

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

  const proseQualityReports = useMemo(() => (
    reviews
      .filter((item: any) => item.review_type === 'prose_quality')
      .slice()
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [reviews])

  const editorReports = useMemo(() => (
    reviews
      .filter((item: any) => item.review_type === 'editor_report')
      .slice()
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [reviews])

  const editorRevisionReports = useMemo(() => (
    reviews
      .filter((item: any) => item.review_type === 'editor_revision')
      .slice()
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [reviews])

  const bookReviews = useMemo(() => (
    reviews
      .filter((item: any) => item.review_type === 'book_review')
      .slice()
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [reviews])

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

  const { confirmReferenceReady } = useReferenceWorkflow({
    projectId,
    referenceSummary,
    onNeedConfig: () => setReferenceConfigOpen(true),
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
    showGenerationBlockedModal,
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
    chapterWordTargetPayload,
    chapters,
    confirmReferenceReady,
    flushPendingSave,
    loadProjectModules,
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
  })
  generateCurrentChapterProseRef.current = generateCurrentChapterProse

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

  const {
    recordStorylineDiffDecision,
    createStorylineDecisionTasks,
  } = createStorylineDecisionHandlers({
    apiClient,
    loadProductionTasks,
    loadProjectModules,
    projectId,
    setAutoDirectorActionLoadingKey,
    setTaskCenterOpen,
  })

  const {
    handlePlanningAction,
    acceptCockpitChapterAndContinue,
    handleWritingCockpitAction,
    runAutoCreationRepairAction,
    runAutoCreationRepairPlan,
    handleAutoCreationDirectorAction,
    handleSerialPipelineAction,
  } = createWorkspaceActionHandlers({
    activeChapter,
    activeChapterId,
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

  const workspaceViewDeps = {
    acceptChapterVersion,
    activeChapter,
    activeChapterDiagnosticsData,
    activeChapterId,
    activeContextPackageData,
    activeKnowledgeJobCount,
    activeTasks,
    agentAuditOpen,
    agentExecution,
    applyEditorRevision,
    applyFuture100SkeletonDraft,
    applyStyleSampleActionForActiveChapter,
    approveChapterGroupStage,
    autoCreationDirectorModel,
    autoDirectorActionLoadingKey,
    backupImportOpen,
    backupImportText,
    bookReviewLoading,
    bookReviews,
    buildPreDraftBriefForActiveChapter,
    bulkUpdateRepairTaskStatus,
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
    confirmPreDraftBriefForActiveChapter,
    consistencyGraphOpen,
    contextPackage,
    contextPackageLoading,
    continuityAudit,
    continuityAuditLoading,
    copyCreativeAssistantCard,
    createBackupSnapshot,
    createEditorReport,
    createFirst30RetentionRepairQueue,
    createLongformProductionRepairQueue,
    createMechanicalQaRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
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
    deleteChapter,
    diagnosticsLoading,
    directoryCollapsed,
    directoryShellClassName,
    downloadBackupPackage,
    editorForm,
    editorKind,
    editorReportLoading,
    editorReports,
    editorRevisionReports,
    executeChapterGroupRun,
    executeReleaseRepairRun,
    executeTypedRepairTask,
    exportDeliveryOpen,
    extractStyleSampleCandidates,
    fillDefaultStyleSampleBank,
    filteredChapters,
    flushPendingSave,
    future100ApplyLoading,
    future100FocusOutlineIds,
    generateCurrentChapterProse,
    generateFuture100Skeleton,
    generateLongformRepairAuditSummary,
    generateSceneCardsForActiveChapter,
    generateWritingBibleEditor,
    generatingProse,
    generatingSceneCards,
    generationPipeline,
    handleAutoCreationDirectorAction,
    handleDirectoryCollapsedChange,
    handleOutlineGenerate,
    handlePlanningAction,
    handleRestructure,
    handleWritingCockpitAction,
    id,
    importBackupPackage,
    incubatingOriginal,
    isEmptyProject,
    isImmersiveShell,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    loadProductionTasks,
    loadProjectModules,
    locateRepairTaskChapter,
    mergeChapterVersion,
    modelOptions,
    navigate,
    openAgentConfigEditor,
    openApprovalPolicyEditor,
    openChapterQualityCard,
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
    recheckRepairTaskConvergence,
    recheckStyleSampleTaskBookReviewTasks,
    recoverRunQueue,
    referenceConfigOpen,
    referenceEngineeringOpen,
    referenceReports,
    referenceSummary,
    refreshActiveProseQuality,
    refreshConsistencyAudit,
    refreshPropagationDebt,
    releaseRepairExecutingId,
    renderSerialPipeline,
    renderWorkspaceArea,
    repairActiveDeslopGate,
    repairContextAndGenerateCurrentChapter,
    repairWritingQueuePlan,
    repairWritingQueuePlanBatch,
    restructurePanelOpen,
    resumeKnowledgeIngestJob,
    retryChapterGroupStage,
    reviewAnnotationsOpen,
    reviewStyleSampleAdjustmentPatch,
    reviews,
    rightPanelOpen,
    rightPanelTab,
    rollbackChapterVersion,
    rollingBackVersionId,
    runBookReview,
    runCreativeAssistant,
    runCreativeCommand,
    runFirst30RetentionDiagnosis,
    runFuture100SkeletonAudit,
    runLongformCreationDiagnosis,
    runLongformPressureTest,
    runMechanicalQa,
    runMechanicalQaLlmReview,
    runOriginalIncubator,
    runPlan,
    runPropagationDebtLlmPlan,
    runQualityBenchmark,
    runRecords,
    runReferenceMigrationPlan,
    runRollingPlan,
    runSimilarityForActiveChapter,
    runTopicValidation,
    runVersionReviewForActiveChapter,
    savePreDraftBriefForActiveChapter,
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
    skipChapterGroupStage,
    sortedChapters,
    startChapterGroupGeneration,
    startChapterPipeline,
    startFuture100ChapterGroupGeneration,
    startReadyChapterGroupGeneration,
    startRepairTaskRevision,
    startRunQueueWorker,
    startUnattendedWritingGoal,
    stepProseLoading,
    stopRunQueueWorker,
    storyAssetsFocusDiscoveredToken,
    storyStateForm,
    storyStateOpen,
    streamingChapterId,
    streamingEndRef,
    streamingPercent,
    streamingProgress,
    streamingText,
    styleSampleCandidateLoading,
    submitEditor,
    taskCenterOpen,
    taskCenterRecoveryFocus,
    unattendedTargetChapter,
    undoStyleSampleAdjustmentPatch,
    updateRepairTaskStatus,
    workspaceArea,
    workspaceAreaTabs,
    worldbuilding,
    writingBibleForm,
    writingBibleGenerating,
    writingBibleOpen,
    writingCockpitModel,
    writingRecommendation,
  }

  const renderSerialPipeline = () => (
    <SerialPipelineStrip model={serialPipelineModel} />
  )


  const activeChapterSceneCards = (
    activeChapter && Array.isArray(activeChapter.scene_list) && activeChapter.scene_list.length > 0
      ? activeChapter.scene_list
      : (activeChapter && Array.isArray(activeChapter.scene_breakdown) ? activeChapter.scene_breakdown : [])
  )

  const writingRecommendation = (() => {
    const materialScore = activeChapterDiagnosticsData?.material_score
    const materialReady = !materialScore || Boolean(materialScore.can_generate)
    const materialRecommendations = Array.isArray(materialScore?.recommendations)
      ? materialScore.recommendations.filter(Boolean)
      : []

    return buildNovelWritingRecommendation({
      materialReady,
      materialRecommendations,
      sceneCardCount: activeChapterSceneCards.length,
      activeWordCount: chapterWordCount(activeChapter),
      deliveryRiskCarryOverActionCount: [
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.requiredActions || []),
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.openingActions || []),
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.middleActions || []),
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.endingActions || []),
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.forbiddenRepeats || []),
      ].length,
      qualityContinuitySceneMapCount: writingCockpitModel.chapterPlanningDesk.qualityContinuitySceneMap.length,
    })
  })()

  const cockpitPrimaryActionOverride: WritingCockpitPrimaryActionOverride | null = (() => {
    if (!activeChapter || workspaceArea !== 'chapterWriting') return null

    switch (writingRecommendation.key) {
      case 'diagnostics':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'open_generation_diagnostics',
          onClick: () => { void openGenerationDiagnostics() },
        }
      case 'scene_cards':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'build_scene_plan',
          onClick: () => { void generateSceneCardsForActiveChapter() },
        }
      case 'repair_generate':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'repair_materials',
          onClick: repairContextAndGenerateCurrentChapter,
        }
      case 'generate':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'write_draft',
          onClick: () => { void generateCurrentChapterProse() },
        }
      case 'quality_card':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'refresh_current_quality',
          onClick: openChapterQualityCard,
        }
      default:
        return null
    }
  })()

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
