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
  buildStyleSampleTaskBookRecheckPlan,
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
import { buildDeliveryRiskRevisionClosurePlan, buildRepairTaskRevisionPrompt } from './repairTaskRevisionPrompt'
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
  renderLongformRepairAuditContentView,
  renderGenerationResultDiffContentView,
} from './shell/workspace-commercial-result'
import { NovelWorkspaceTopBar } from './shell/workspace-topbar'
import { NovelWorkspaceDeferredSurfaces } from './shell/workspace-deferred-surfaces'
import { NovelWorkspaceBody } from './shell/workspace-body'
import { createCommercialToolHandlers } from './shell/workspace-commercial-tools'
import { createPreflightHandlers } from './shell/workspace-preflight-handlers'
import { createRepairTaskHandlers } from './shell/workspace-repair-task-handlers'
import { createWorkspaceActionHandlers } from './shell/workspace-action-handlers'
import { createChapterProseHandlers } from './shell/workspace-chapter-prose-handlers'
import { createWritingBibleHandlers } from './shell/workspace-writing-bible-handlers'
import { createPlanningHandlers } from './shell/workspace-planning-handlers'
import { createProductionHandlers } from './shell/workspace-production-handlers'
import { createEditorHandlers } from './shell/workspace-editor-handlers'
import { createRunQueueHandlers } from './shell/workspace-run-queue-handlers'
import { createChapterPrepHandlers } from './shell/workspace-chapter-prep-handlers'
import { createDiagnosticsHandlers } from './shell/workspace-diagnostics-handlers'
import { createCreativeHandlers } from './shell/workspace-creative-handlers'
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
  type EditorReportForChapterOptions,
  type TaskCenterActionOptions,
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

  const repairWritingQueuePlan = async (item: any) => {
    const chapterId = Number(item?.id || 0)
    if (!chapterId) return message.warning('这个队列项没有绑定章节')
    if (!await selectChapterForWriting(chapterId)) return
    await runRollingPlan({
      intent: {
        ...(item?.repairIntent || {}),
        source: 'writing_queue_plan_repair',
        chapter_id: chapterId,
        chapter_no: Number(item?.chapterNo || 0),
        title: item?.title || '',
        source_label: item?.sourceLabel || '',
        missing_fields: Array.isArray(item?.missingPlanFields) ? item.missingPlanFields : [],
        missing_labels: Array.isArray(item?.missingPlanLabels) ? item.missingPlanLabels : [],
        instruction: '只补齐当前章节的目标、核心冲突、章末钩子和必要场景职责，不改长期主线、不提前消费后续爆点。',
      },
    })
  }

  const repairWritingQueuePlanBatch = async (queue: any) => {
    const intent = queue?.planRepair?.intent
    if (!intent) return message.warning('当前队列没有可补齐的计划缺口')
    await runRollingPlan({
      intent: {
        ...intent,
        source: 'writing_queue_batch_plan_repair',
        instruction: '批量补齐写作队列里缺少的章节目标、核心冲突、章末钩子和必要场景职责；保持章节顺序、长期主线、剧情线和禁揭边界不变，不提前消费后续爆点。',
      },
    })
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

  const mergeChapterVersion = async (version: any, choices: Array<{ index: number; source: 'current' | 'version' }>) => {
    if (!activeChapter) return
    if (!await flushPendingSave()) return
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/version-merge`, {
        project_id: projectId,
        version_id: version.id,
        choices,
      })
      if (res.data?.chapter) setChapters(prev => prev.map(ch => ch.id === res.data.chapter.id ? res.data.chapter : ch))
      await loadProjectModules()
      setChapterVersionDetail(null)
      message.success('合并稿已生成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '版本合并失败')
    }
  }

  const acceptChapterVersion = async (version: any) => {
    await rollbackChapterVersion(version.id)
    setChapterVersionDetail(null)
  }

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

  const generateSceneCardsForChapter = async (chapterId: number, allowIncomplete = false) => {
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    setGeneratingSceneCards(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${chapterId}/scene-cards`, {
        project_id: projectId,
        model_id: selectedModelId,
        allow_incomplete: allowIncomplete,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      message.success(`场景卡已生成：${Array.isArray(res.data?.scene_cards) ? res.data.scene_cards.length : 0} 个`)
    } catch (error: any) {
      const payload = error?.response?.data
      if (payload?.error_code === 'SCENE_PREFLIGHT_BLOCKED') {
        showGenerationBlockedModal(payload, () => { void generateSceneCardsForChapter(chapterId, true) }, {
          targetChapterId: chapterId,
          onRepairComplete: () => { void generateSceneCardsForChapter(chapterId, false) },
        })
      } else {
        message.error(payload?.error || error?.message || '场景卡生成失败')
      }
    } finally {
      setGeneratingSceneCards(false)
    }
  }

  const generateSceneCardsForActiveChapter = async (allowIncomplete = false) => {
    if (!activeChapter) return message.warning('请先选择章节')
    await generateSceneCardsForChapter(Number(activeChapter.id), allowIncomplete)
  }

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

  const createEditorReport = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    await createEditorReportForChapter(activeChapter.id)
  }

  const createEditorReportForChapter = async (chapterId: number, options: EditorReportForChapterOptions = {}) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    setEditorReportLoading(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${chapterId}/editor-report`, {
        project_id: projectId,
        model_id: selectedModelId,
      })
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('editorReports')
      if (options.autoRevision && res.data?.review) {
        const task = options.sourceTask || {}
        const revisionResult = await applyEditorRevision(res.data.review, {
          revisionMode: String(task.message || task.issue_type || '').includes('钩子') ? 'restore_hook' : 'tighten_pacing',
          prompt: buildRepairTaskRevisionPrompt(task, options.sourceRun),
          sourceTask: task,
          sourceRun: options.sourceRun,
          sourceTaskIndex: options.sourceTaskIndex,
          skipConfirm: options.skipRevisionConfirm,
        })
        return revisionResult
      } else {
        message.success('编辑报告已生成')
      }
      return res.data
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '编辑报告生成失败')
      return null
    } finally {
      setEditorReportLoading(false)
    }
  }

  const locateRepairTaskChapter = async (chapterId: number) => {
    if (await selectChapterForWriting(chapterId)) {
      setTaskCenterOpen(false)
      setRightPanelOpen(true)
      message.success('已定位到章节')
    }
  }

  const openRepairTaskChapterEditor = async (chapterId: number) => {
    if (!await selectChapterForWriting(chapterId)) return
    const chapter = chapters.find(ch => Number(ch.id) === Number(chapterId))
    if (chapter) {
      setTaskCenterOpen(false)
      openEditor('chapter', chapter)
    }
  }

  const startRepairTaskRevision = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const chapterId = Number(task?.chapter_id || 0)
    if (!chapterId) return message.warning('这个任务没有绑定章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await selectChapterForWriting(chapterId)) return
    if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
    await createEditorReportForChapter(chapterId, { sourceTask: task, sourceRun: run, sourceTaskIndex: taskIndex, autoRevision: true })
  }

  const updateRepairTaskStatus = async (run: any, taskIndex: number, status: string, note = '') => {
    try {
      await apiClient.post(`/novel/runs/${run.id}/tasks/${taskIndex}/status`, {
        project_id: projectId,
        status,
        note,
      })
      await loadProjectModules()
      await loadProductionTasks()
      message.success(status === 'resolved' ? '任务已标记为已处理' : status === 'needs_review' ? '任务已标记为需复查' : '任务状态已更新')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务状态更新失败')
    }
  }

  const bulkUpdateRepairTaskStatus = async (items: any[], status: string) => {
    try {
      const grouped = new Map<number, { run: any; indices: number[] }>()
      for (const item of items || []) {
        const runId = Number(item?.run?.id || 0)
        if (!runId || !Number.isInteger(Number(item?.taskIndex))) continue
        const existing = grouped.get(runId) || { run: item.run, indices: [] }
        existing.indices.push(Number(item.taskIndex))
        grouped.set(runId, existing)
      }
      for (const group of grouped.values()) {
        await apiClient.post(`/novel/runs/${group.run.id}/tasks/status-bulk`, {
          project_id: projectId,
          task_indices: group.indices,
          status,
          note: status === 'resolved' ? '批量复查确认通过' : '批量状态更新',
        })
      }
      await loadProjectModules()
      await loadProductionTasks()
      message.success(status === 'resolved' ? `已确认通过 ${items.length} 个复查任务` : `已更新 ${items.length} 个任务`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '批量更新任务状态失败')
    }
  }

  const recheckStyleSampleTaskBookReviewTasks = async (items: any[]) => {
    const preflight = autoCreationDirectorModel.batchGuardrail.preflight.inputSnapshot?.style_sample_batch_preflight
    const plan = buildStyleSampleTaskBookRecheckPlan({
      items,
      styleSampleBatchPreflight: preflight,
    })
    if (plan.status === 'needs_preflight') {
      message.warning(plan.summary)
      return
    }
    if (!plan.resolvedItems.length) {
      message.warning(plan.summary)
      return
    }
    try {
      const grouped = new Map<number, { run: any; indices: number[] }>()
      for (const item of plan.resolvedItems) {
        const runId = Number(item?.run?.id || 0)
        if (!runId || !Number.isInteger(Number(item?.taskIndex))) continue
        const existing = grouped.get(runId) || { run: item.run, indices: [] }
        existing.indices.push(Number(item.taskIndex))
        grouped.set(runId, existing)
      }
      for (const group of grouped.values()) {
        await apiClient.post(`/novel/runs/${group.run.id}/tasks/status-bulk`, {
          project_id: projectId,
          task_indices: group.indices,
          status: 'resolved',
          note: '样章任务书复检通过：下一批任务书已避开风险样章',
        })
      }
      await loadProjectModules()
      await loadProductionTasks()
      if (plan.blockedItems.length > 0) {
        message.warning(plan.summary)
      } else {
        message.success(plan.summary)
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章任务书复检失败')
    }
  }

  const generateLongformRepairAuditSummary = async (run: any, options: TaskCenterActionOptions = {}) => {
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/longform-production-trends/repair-runs/${run.id}/audit-summary`)
      const audit = res.data?.audit || {}
      await loadProjectModules()
      await loadProductionTasks()
      if (options.keepTaskCenterOpen) {
        message.success('恢复依据复盘已刷新')
        return
      }
      Modal.info({
        title: '长线生产修复闭环审计',
        width: 760,
        content: renderLongformRepairAuditContentView(audit),
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成闭环审计失败')
    }
  }

  const executeStyleSampleTaskBookRebuild = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const chapterId = Number(task?.chapter_id || 0)
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    const targetChapter = (chapterId ? sortedChapters.find(item => Number(item.id) === chapterId) : null)
      || (chapterNo ? sortedChapters.find(item => Number(item.chapter_no || 0) === chapterNo) : null)
      || null
    if (!targetChapter?.id) {
      message.warning('这个样章任务没有匹配章节')
      return
    }
    if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
    const changed = await applyStyleSampleActionForChapter(targetChapter, 'replace', '已换样章并重审任务书，请重新确认任务书')
    if (changed && run?.id && taskIndex >= 0) {
      await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已换样章并清除任务书确认状态，等待作者重审任务书')
    }
  }

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
    flushPendingSave,
    loadProjectModules,
    loadProductionTasks,
    openEditor,
    openRepairTaskChapterEditor,
    outlines,
    projectId,
    reviews,
    runRecords,
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

  const deleteProject = () => {
    if (!selectedProject) return
    Modal.confirm({
      title: '删除项目',
      content: '确定删除整个项目吗？此操作会清理所有目录、章节和版本记录。',
      okText: '删除', okButtonProps: { danger: true },
      onOk: async () => { await apiClient.delete(`/novel/projects/${selectedProject.id}`); navigate('/novel') },
    })
  }

  const deleteChapter = async (cid: number) => {
    if (!await flushPendingSave()) return
    await apiClient.delete(`/novel/chapters/${cid}`)
    await loadProjectModules()
  }

  const deleteOutline = async (oid: number) => {
    await apiClient.delete(`/novel/outlines/${oid}`)
    await loadProjectModules()
  }

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

  const recordStorylineDiffDecision = async (intent: any) => {
    if (!intent?.decisionKey) return message.warning('缺少剧情线差异决策键')
    try {
      await apiClient.post(`/novel/projects/${projectId}/storyline-diff-decisions`, {
        decision_key: intent.decisionKey,
        decision: intent.recommendedDecision,
        chapter_no: intent.chapterNo,
        entity_id: intent.entityId,
        entity_name: intent.entityName,
        entity_type: intent.entityType,
        risk_type: intent.riskType,
        risk_label: intent.riskLabel,
        summary: intent.summary,
        evidence: intent.evidence,
      })
      await loadProjectModules()
      message.success(`已记录剧情线决策：${intent.recommendedActionLabel || '已处理'}`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '剧情线决策记录失败')
    }
  }

  const createStorylineDecisionTasks = async () => {
    setAutoDirectorActionLoadingKey('create_storyline_decision_tasks')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/storyline-diff-decisions/repair-queue`)
      const tasks = res.data?.tasks || []
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      const skipped = Number(res.data?.skipped_existing || 0)
      const ignored = Number(res.data?.skipped_ignored || 0)
      message.success(`已生成剧情线决策任务：${tasks.length} 项${skipped ? `，跳过已有 ${skipped} 项` : ''}${ignored ? `，忽略误判 ${ignored} 项` : ''}`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成剧情线决策任务失败')
    } finally {
      setAutoDirectorActionLoadingKey('')
    }
  }

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
    <NovelWorkspaceAreaView
      activeChapter={activeChapter}
      activeChapterDiagnosticsData={activeChapterDiagnosticsData}
      activeChapterId={activeChapterId}
      applyStyleSampleActionForActiveChapter={applyStyleSampleActionForActiveChapter}
      autoCreationDirectorModel={autoCreationDirectorModel}
      autoDirectorActionLoadingKey={autoDirectorActionLoadingKey}
      bookReviewLoading={bookReviewLoading}
      buildPreDraftBriefForActiveChapter={buildPreDraftBriefForActiveChapter}
      chapterTargetWordCount={chapterTargetWordCount}
      chapterWordTargetMode={chapterWordTargetMode}
      characters={characters}
      commercialToolLoading={commercialToolLoading}
      confirmPreDraftBriefForActiveChapter={confirmPreDraftBriefForActiveChapter}
      continuityAudit={continuityAudit}
      createEditorReport={createEditorReport}
      dashboardLoading={dashboardLoading}
      diagnosticsLoading={diagnosticsLoading}
      editorReportLoading={editorReportLoading}
      generateCurrentChapterProse={generateCurrentChapterProse}
      generateSceneCardsForActiveChapter={generateSceneCardsForActiveChapter}
      generatingProse={generatingProse}
      generatingSceneCards={generatingSceneCards}
      generationPipeline={generationPipeline}
      handleAutoCreationDirectorAction={handleAutoCreationDirectorAction}
      handlePlanningAction={handlePlanningAction}
      handleWritingCockpitAction={handleWritingCockpitAction}
      id={id}
      incubatingOriginal={incubatingOriginal}
      isEmptyProject={isEmptyProject}
      isImmersiveShell={isImmersiveShell}
      loadProjectModules={loadProjectModules}
      openChapterQualityCard={openChapterQualityCard}
      openContinuityAudit={openContinuityAudit}
      openEditor={openEditor}
      openGenerationDiagnostics={openGenerationDiagnostics}
      openProductionDashboard={openProductionDashboard}
      openProductionDesk={openProductionDesk}
      openProductionMetrics={openProductionMetrics}
      openRunQueue={openRunQueue}
      openStoryAssetsWorkspace={openStoryAssetsWorkspace}
      openStoryStateEditor={openStoryStateEditor}
      openWritingBibleEditor={openWritingBibleEditor}
      outlines={outlines}
      pipelineLoading={pipelineLoading}
      planning={planning}
      planningLoadingKey={planningLoadingKey}
      planningWorkspaceModel={planningWorkspaceModel}
      projectId={projectId}
      projectSettings={projectSettings}
      proseEditorRef={proseEditorRef}
      proseQualityLoading={proseQualityLoading}
      repairActiveDeslopGate={repairActiveDeslopGate}
      repairContextAndGenerateCurrentChapter={repairContextAndGenerateCurrentChapter}
      repairWritingQueuePlan={repairWritingQueuePlan}
      repairWritingQueuePlanBatch={repairWritingQueuePlanBatch}
      runBookReview={runBookReview}
      runOriginalIncubator={runOriginalIncubator}
      runPlan={runPlan}
      runReferenceMigrationPlan={runReferenceMigrationPlan}
      savePreDraftBriefForActiveChapter={savePreDraftBriefForActiveChapter}
      saveStatus={saveStatus}
      scheduleSave={scheduleSave}
      selectChapterForWriting={selectChapterForWriting}
      selectedModelId={selectedModelId}
      selectedProject={selectedProject}
      setAgentAuditOpen={setAgentAuditOpen}
      setChapterTargetWordCount={setChapterTargetWordCount}
      setChapterWordTargetMode={setChapterWordTargetMode}
      setChapters={setChapters}
      setCommercialToolsOpen={setCommercialToolsOpen}
      setConsistencyGraphOpen={setConsistencyGraphOpen}
      setCreativeCardsOpen={setCreativeCardsOpen}
      setExportDeliveryOpen={setExportDeliveryOpen}
      setQualityBenchmarkOpen={setQualityBenchmarkOpen}
      setReferenceConfigOpen={setReferenceConfigOpen}
      setReferenceEngineeringOpen={setReferenceEngineeringOpen}
      setReviewAnnotationsOpen={setReviewAnnotationsOpen}
      setTaskCenterOpen={setTaskCenterOpen}
      setUnattendedTargetChapter={setUnattendedTargetChapter}
      setWorkspaceArea={setWorkspaceArea}
      sortedChapters={sortedChapters}
      startChapterGroupGeneration={startChapterGroupGeneration}
      startChapterPipeline={startChapterPipeline}
      startReadyChapterGroupGeneration={startReadyChapterGroupGeneration}
      startUnattendedWritingGoal={startUnattendedWritingGoal}
      storyAssetsFocusDiscoveredToken={storyAssetsFocusDiscoveredToken}
      streamingChapterId={streamingChapterId}
      streamingEndRef={streamingEndRef}
      streamingPercent={streamingPercent}
      streamingProgress={streamingProgress}
      streamingText={streamingText}
      unattendedTargetChapter={unattendedTargetChapter}
      workspaceArea={workspaceArea}
      worldbuilding={worldbuilding}
      writingCockpitModel={writingCockpitModel}
      writingRecommendation={writingRecommendation}
    />
  )

  return (
    <div
      className={`novel-project-workspace ${rootShellClassName(isImmersiveShell)}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: '#fff' }}
    >

      <NovelWorkspaceTopBar
        activeKnowledgeJobCount={activeKnowledgeJobCount}
        activeTasks={activeTasks}
        flushPendingSave={flushPendingSave}
        isImmersiveShell={isImmersiveShell}
        loadProjectModules={loadProjectModules}
        modelOptions={modelOptions}
        navigate={navigate}
        openCreativeAssistant={openCreativeAssistant}
        referenceSummary={referenceSummary}
        selectedModelId={selectedModelId}
        selectedProject={selectedProject}
        setSelectedModelId={setSelectedModelId}
        setShellMode={setShellMode}
        setTaskCenterOpen={setTaskCenterOpen}
        setWorkspaceArea={setWorkspaceArea}
        workspaceArea={workspaceArea}
        workspaceAreaTabs={workspaceAreaTabs}
      />

      <NovelWorkspaceBody
        activeChapter={activeChapter}
        activeChapterDiagnosticsData={activeChapterDiagnosticsData}
        activeChapterId={activeChapterId}
        activeContextPackageData={activeContextPackageData}
        activeKnowledgeJobCount={activeKnowledgeJobCount}
        activeTasks={activeTasks}
        applyEditorRevision={applyEditorRevision}
        bookReviews={bookReviews}
        chapterId={chapterId}
        chapterVersions={chapterVersions}
        chapterVersionsLoading={chapterVersionsLoading}
        characters={characters}
        cockpitPrimaryActionOverride={cockpitPrimaryActionOverride}
        commercialReadiness={commercialReadiness}
        commercialToolLoading={commercialToolLoading}
        contextPackage={contextPackage}
        contextPackageLoading={contextPackageLoading}
        copyCreativeAssistantCard={copyCreativeAssistantCard}
        creativeAssistantError={creativeAssistantError}
        creativeAssistantLoading={creativeAssistantLoading}
        creativeAssistantMode={creativeAssistantMode}
        creativeAssistantOpen={creativeAssistantOpen}
        creativeAssistantResult={creativeAssistantResult}
        creativeAssistantSelectedText={creativeAssistantSelectedText}
        diagnosticsLoading={diagnosticsLoading}
        directoryCollapsed={directoryCollapsed}
        directoryShellClassName={directoryShellClassName}
        editorReports={editorReports}
        editorRevisionReports={editorRevisionReports}
        generatingProse={generatingProse}
        generatingSceneCards={generatingSceneCards}
        handleDirectoryCollapsedChange={handleDirectoryCollapsedChange}
        handleWritingCockpitAction={handleWritingCockpitAction}
        isImmersiveShell={isImmersiveShell}
        openEditor={openEditor}
        openStoryStateEditor={openStoryStateEditor}
        outlines={outlines}
        projectId={projectId}
        proseChapters={proseChapters}
        proseProgress={proseProgress}
        proseQualityLoading={proseQualityLoading}
        proseQualityReports={proseQualityReports}
        referenceReports={referenceReports}
        refreshActiveProseQuality={refreshActiveProseQuality}
        renderSerialPipeline={renderSerialPipeline}
        renderWorkspaceArea={renderWorkspaceArea}
        reviews={reviews}
        rightPanelOpen={rightPanelOpen}
        rightPanelTab={rightPanelTab}
        rollbackChapterVersion={rollbackChapterVersion}
        rollingBackVersionId={rollingBackVersionId}
        runCreativeAssistant={runCreativeAssistant}
        runRecords={runRecords}
        selectChapterForWriting={selectChapterForWriting}
        selectedModelId={selectedModelId}
        selectedProject={selectedProject}
        setChapterDrawerOpen={setChapterDrawerOpen}
        setChapterVersionDetail={setChapterVersionDetail}
        setCreativeAssistantMode={setCreativeAssistantMode}
        setCreativeAssistantOpen={setCreativeAssistantOpen}
        setCreativeCardsOpen={setCreativeCardsOpen}
        setOutlineTreeOpen={setOutlineTreeOpen}
        setRightPanelOpen={setRightPanelOpen}
        setRightPanelTab={setRightPanelTab}
        setTaskCenterOpen={setTaskCenterOpen}
        setWorkspaceArea={setWorkspaceArea}
        showGlobalWritingGuidance={showGlobalWritingGuidance}
        sortedChapters={sortedChapters}
        stepProseLoading={stepProseLoading}
        workspaceArea={workspaceArea}
        worldbuilding={worldbuilding}
        writingCockpitModel={writingCockpitModel}
      />
      <NovelWorkspaceDeferredSurfaces
        acceptChapterVersion={acceptChapterVersion}
        activeChapter={activeChapter}
        activeChapterId={activeChapterId}
        activeTasks={activeTasks}
        agentAuditOpen={agentAuditOpen}
        agentExecution={agentExecution}
        applyEditorRevision={applyEditorRevision}
        applyFuture100SkeletonDraft={applyFuture100SkeletonDraft}
        approveChapterGroupStage={approveChapterGroupStage}
        backupImportOpen={backupImportOpen}
        backupImportText={backupImportText}
        bulkUpdateRepairTaskStatus={bulkUpdateRepairTaskStatus}
        cancelKnowledgeIngestJob={cancelKnowledgeIngestJob}
        chapterDrawerOpen={chapterDrawerOpen}
        chapterGroupExecutingId={chapterGroupExecutingId}
        chapterSearch={chapterSearch}
        chapterSortMode={chapterSortMode}
        chapterStatusFilter={chapterStatusFilter}
        chapterTreeData={chapterTreeData}
        chapterVersionDetail={chapterVersionDetail}
        chapters={chapters}
        characters={characters}
        commercialToolsOpen={commercialToolsOpen}
        consistencyGraphOpen={consistencyGraphOpen}
        continuityAudit={continuityAudit}
        continuityAuditLoading={continuityAuditLoading}
        createBackupSnapshot={createBackupSnapshot}
        createFirst30RetentionRepairQueue={createFirst30RetentionRepairQueue}
        createLongformProductionRepairQueue={createLongformProductionRepairQueue}
        createMechanicalQaRepairQueue={createMechanicalQaRepairQueue}
        createRecoveryEvidenceGovernanceQueue={createRecoveryEvidenceGovernanceQueue}
        creativeCardsOpen={creativeCardsOpen}
        creativeCommandOpen={creativeCommandOpen}
        creativeCommandText={creativeCommandText}
        deleteChapter={deleteChapter}
        downloadBackupPackage={downloadBackupPackage}
        editorForm={editorForm}
        editorKind={editorKind}
        executeChapterGroupRun={executeChapterGroupRun}
        executeReleaseRepairRun={executeReleaseRepairRun}
        executeTypedRepairTask={executeTypedRepairTask}
        exportDeliveryOpen={exportDeliveryOpen}
        extractStyleSampleCandidates={extractStyleSampleCandidates}
        fillDefaultStyleSampleBank={fillDefaultStyleSampleBank}
        filteredChapters={filteredChapters}
        flushPendingSave={flushPendingSave}
        future100ApplyLoading={future100ApplyLoading}
        future100FocusOutlineIds={future100FocusOutlineIds}
        generateCurrentChapterProse={generateCurrentChapterProse}
        generateFuture100Skeleton={generateFuture100Skeleton}
        generateLongformRepairAuditSummary={generateLongformRepairAuditSummary}
        generateWritingBibleEditor={generateWritingBibleEditor}
        generatingProse={generatingProse}
        handleOutlineGenerate={handleOutlineGenerate}
        handleRestructure={handleRestructure}
        importBackupPackage={importBackupPackage}
        knowledgeIngestJobs={knowledgeIngestJobs}
        knowledgeJobsLoading={knowledgeJobsLoading}
        loadKnowledgeIngestJobs={loadKnowledgeIngestJobs}
        loadProductionTasks={loadProductionTasks}
        loadProjectModules={loadProjectModules}
        locateRepairTaskChapter={locateRepairTaskChapter}
        mergeChapterVersion={mergeChapterVersion}
        openAgentConfigEditor={openAgentConfigEditor}
        openApprovalPolicyEditor={openApprovalPolicyEditor}
        openChapterQualityCard={openChapterQualityCard}
        openContinuityAudit={openContinuityAudit}
        openEditor={openEditor}
        openGenreTemplates={openGenreTemplates}
        openLongformProductionTrends={openLongformProductionTrends}
        openMaterialRepairPlan={openMaterialRepairPlan}
        openModelDiagnostics={openModelDiagnostics}
        openProductionDesk={openProductionDesk}
        openProductionMetrics={openProductionMetrics}
        openReferenceKnowledgeDiagnosis={openReferenceKnowledgeDiagnosis}
        openRepairTaskChapterEditor={openRepairTaskChapterEditor}
        openRunQueue={openRunQueue}
        openStoryStateEditor={openStoryStateEditor}
        openWritingBibleEditor={openWritingBibleEditor}
        outlinePanelOpen={outlinePanelOpen}
        outlineTreeOpen={outlineTreeOpen}
        outlines={outlines}
        pauseKnowledgeIngestJob={pauseKnowledgeIngestJob}
        previewStyleSampleAdjustmentBatch={previewStyleSampleAdjustmentBatch}
        previewStyleSampleAdjustmentPatch={previewStyleSampleAdjustmentPatch}
        productionMode={productionMode}
        productionModeOptions={productionModeOptions}
        productionTasks={productionTasks}
        projectId={projectId}
        proseChapters={proseChapters}
        qualityBenchmarkOpen={qualityBenchmarkOpen}
        recheckRepairTaskConvergence={recheckRepairTaskConvergence}
        recheckStyleSampleTaskBookReviewTasks={recheckStyleSampleTaskBookReviewTasks}
        recoverRunQueue={recoverRunQueue}
        referenceConfigOpen={referenceConfigOpen}
        referenceEngineeringOpen={referenceEngineeringOpen}
        referenceReports={referenceReports}
        refreshConsistencyAudit={refreshConsistencyAudit}
        refreshPropagationDebt={refreshPropagationDebt}
        releaseRepairExecutingId={releaseRepairExecutingId}
        restructurePanelOpen={restructurePanelOpen}
        resumeKnowledgeIngestJob={resumeKnowledgeIngestJob}
        retryChapterGroupStage={retryChapterGroupStage}
        reviewAnnotationsOpen={reviewAnnotationsOpen}
        reviewStyleSampleAdjustmentPatch={reviewStyleSampleAdjustmentPatch}
        reviews={reviews}
        rollingBackVersionId={rollingBackVersionId}
        runCreativeCommand={runCreativeCommand}
        runFirst30RetentionDiagnosis={runFirst30RetentionDiagnosis}
        runFuture100SkeletonAudit={runFuture100SkeletonAudit}
        runLongformCreationDiagnosis={runLongformCreationDiagnosis}
        runLongformPressureTest={runLongformPressureTest}
        runMechanicalQa={runMechanicalQa}
        runMechanicalQaLlmReview={runMechanicalQaLlmReview}
        runPropagationDebtLlmPlan={runPropagationDebtLlmPlan}
        runQualityBenchmark={runQualityBenchmark}
        runRecords={runRecords}
        runReferenceMigrationPlan={runReferenceMigrationPlan}
        runRollingPlan={runRollingPlan}
        runSimilarityForActiveChapter={runSimilarityForActiveChapter}
        runTopicValidation={runTopicValidation}
        runVersionReviewForActiveChapter={runVersionReviewForActiveChapter}
        saveStoryStateEditor={saveStoryStateEditor}
        saveWritingBibleEditor={saveWritingBibleEditor}
        selectChapterForWriting={selectChapterForWriting}
        selectMode={selectMode}
        selectedChapterIds={selectedChapterIds}
        selectedChaptersList={selectedChaptersList}
        selectedModelId={selectedModelId}
        selectedProject={selectedProject}
        setAgentAuditOpen={setAgentAuditOpen}
        setAgentExecution={setAgentExecution}
        setBackupImportOpen={setBackupImportOpen}
        setBackupImportText={setBackupImportText}
        setChapterDrawerOpen={setChapterDrawerOpen}
        setChapterSearch={setChapterSearch}
        setChapterSortMode={setChapterSortMode}
        setChapterStatusFilter={setChapterStatusFilter}
        setChapterVersionDetail={setChapterVersionDetail}
        setCommercialToolsOpen={setCommercialToolsOpen}
        setConsistencyGraphOpen={setConsistencyGraphOpen}
        setCreativeCardsOpen={setCreativeCardsOpen}
        setCreativeCommandOpen={setCreativeCommandOpen}
        setCreativeCommandText={setCreativeCommandText}
        setEditorItem={setEditorItem}
        setEditorKind={setEditorKind}
        setExportDeliveryOpen={setExportDeliveryOpen}
        setFuture100Draft={setFuture100Draft}
        setFuture100FocusOutlineIds={setFuture100FocusOutlineIds}
        setFuture100SelectedNos={setFuture100SelectedNos}
        setOutlinePanelOpen={setOutlinePanelOpen}
        setOutlineTreeOpen={setOutlineTreeOpen}
        setProductionMode={setProductionMode}
        setQualityBenchmarkOpen={setQualityBenchmarkOpen}
        setReferenceConfigOpen={setReferenceConfigOpen}
        setReferenceEngineeringOpen={setReferenceEngineeringOpen}
        setRestructurePanelOpen={setRestructurePanelOpen}
        setReviewAnnotationsOpen={setReviewAnnotationsOpen}
        setRightPanelOpen={setRightPanelOpen}
        setRightPanelTab={setRightPanelTab}
        setSelectMode={setSelectMode}
        setSelectedChapterIds={setSelectedChapterIds}
        setSelectedProject={setSelectedProject}
        setShowOnlyDiff={setShowOnlyDiff}
        setStoryStateOpen={setStoryStateOpen}
        setTaskCenterOpen={setTaskCenterOpen}
        setTaskCenterRecoveryFocus={setTaskCenterRecoveryFocus}
        setUnattendedTargetChapter={setUnattendedTargetChapter}
        setWritingBibleOpen={setWritingBibleOpen}
        showOnlyDiff={showOnlyDiff}
        skipChapterGroupStage={skipChapterGroupStage}
        sortedChapters={sortedChapters}
        startFuture100ChapterGroupGeneration={startFuture100ChapterGroupGeneration}
        startReadyChapterGroupGeneration={startReadyChapterGroupGeneration}
        startRepairTaskRevision={startRepairTaskRevision}
        startRunQueueWorker={startRunQueueWorker}
        startUnattendedWritingGoal={startUnattendedWritingGoal}
        stopRunQueueWorker={stopRunQueueWorker}
        storyStateForm={storyStateForm}
        storyStateOpen={storyStateOpen}
        styleSampleCandidateLoading={styleSampleCandidateLoading}
        submitEditor={submitEditor}
        taskCenterOpen={taskCenterOpen}
        taskCenterRecoveryFocus={taskCenterRecoveryFocus}
        unattendedTargetChapter={unattendedTargetChapter}
        undoStyleSampleAdjustmentPatch={undoStyleSampleAdjustmentPatch}
        updateRepairTaskStatus={updateRepairTaskStatus}
        worldbuilding={worldbuilding}
        writingBibleForm={writingBibleForm}
        writingBibleGenerating={writingBibleGenerating}
        writingBibleOpen={writingBibleOpen}
      />

    </div>
  )
}
