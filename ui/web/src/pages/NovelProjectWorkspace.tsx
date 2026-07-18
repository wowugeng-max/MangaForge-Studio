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
import apiClient from '../api/client'
import { createSSEClient, generateClientId, type SSEMessage } from '../utils/sse'
import { ChapterDirectorySidebar } from './novel-workspace/ChapterDirectorySidebar'
import { CreativeAssistantPanel } from './novel-workspace/CreativeAssistantPanel'
import type { EditorKind } from './novel-workspace/EditorModal'
import { ReferencePanel } from './novel-workspace/ReferencePanel'
import { StoryAssetsWorkspace } from './novel-workspace/StoryAssetsWorkspace'
import { StoryPlanningWorkspace, type PlanningLoadingKey } from './novel-workspace/StoryPlanningWorkspace'
import { WritingCockpitPanel, type WritingCockpitPrimaryActionOverride } from './novel-workspace/WritingCockpitPanel'
import { WorkspaceCenter } from './novel-workspace/WorkspaceCenter'
import {
  buildAutoCreationDirectorModel,
  buildStyleSampleTaskBookRecheckPlan,
  type AutoCreationDirectorAction,
} from './novel-workspace/autoCreationDirectorModel'
import { buildNovelWritingRecommendation } from './novel-workspace/writingRecommendationModel'
import { buildPlanningWorkspaceModel, type PlanningActionKey } from './novel-workspace/planningWorkspaceModel'
import {
  mergeCommercialWebNovelStyleDefaults,
  mergeCommercialWebNovelStyleSampleDefaults,
} from './novel-workspace/writingBibleDefaults'
import {
  buildWritingCockpitModel,
  resolveEditorRevisionChapterId,
  selectTargetChapterForWriting,
  type WritingCockpitActionKey,
} from './novel-workspace/writingCockpitModel'
import {
  normalizeCreativeAssistPayload,
  type CreativeAssistCard,
  type CreativeAssistResult,
  type CreativeAssistantModeKey,
} from './novel-workspace/creativeAssistantModel'
import { useChapterAutosave } from './novel-workspace/useChapterAutosave'
import { useChapterVersions } from './novel-workspace/useChapterVersions'
import { useNovelWorkspaceData, type ChapterSortMode, type ChapterStatusFilter } from './novel-workspace/useNovelWorkspaceData'
import { buildDeliveryRiskRevisionClosurePlan, buildRepairTaskRevisionPrompt } from './novel-workspace/repairTaskRevisionPrompt'
import type { SafeBatchRecoveryFocusSnapshot } from './novel-workspace/TaskCenterDrawer'
import { useReferenceWorkflow } from './novel-workspace/useReferenceWorkflow'
import { useWorkspaceTasks } from './novel-workspace/useWorkspaceTasks'
import {
  chapterHasProse,
  chapterWordCount,
  displayValue,
  summarizeOutlineExecution,
  wc,
} from './novel-workspace/utils'
import { buildSerialPipelineViewModel } from './novel-workspace/serialPipelineModel'
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
} from './novel-workspace/workspaceShellModel'
import {
  DeferredWorkspaceSurfaces,
  buildRecoveryEvidenceQueueRecheckTask,
  formatRunResumeErrorMessage,
  formatStoryStateSyncFailure,
  safeBatchRecoveryFocusFromPayload,
} from './novel-workspace/shell/workspace-helpers'
import {
  formatJsonField,
  formatListField,
  parseJsonField,
  parseListField,
} from './novel-workspace/shell/workspace-editor-fields'
import {
  renderChapterQualityCardContentView,
  renderProductionDashboardContentView,
  renderStyleSamplePatchPreviewContentView,
  renderLongformRepairAuditContentView,
  renderGenerationResultDiffContentView,
} from './novel-workspace/shell/workspace-commercial-result'
import {
  renderOriginalIncubationEmptyErrorContentView,
  renderOriginalIncubationPreviewContentView,
} from './novel-workspace/shell/workspace-incubator-views'
import { NovelWorkspaceTopBar } from './novel-workspace/shell/workspace-topbar'
import { NovelWorkspaceDeferredSurfaces } from './novel-workspace/shell/workspace-deferred-surfaces'
import { NovelWorkspaceBody } from './novel-workspace/shell/workspace-body'
import { createCommercialToolHandlers } from './novel-workspace/shell/workspace-commercial-tools'
import { createPreflightHandlers } from './novel-workspace/shell/workspace-preflight-handlers'
import { createRepairTaskHandlers } from './novel-workspace/shell/workspace-repair-task-handlers'
import {
  isAutoCreationPlanningArea,
  isAutoCreationWritingArea,
  resolveWritingCockpitTarget,
  runPlanningAction,
  serialPipelineActionWorkspaceArea,
} from './novel-workspace/shell/workspace-action-routers'
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
} from './novel-workspace/shell/workspace-lazy'
import {
  productionModeOptions,
  type ChapterOwnedData,
  type ChapterWordTargetMode,
  type EditorReportForChapterOptions,
  type TaskCenterActionOptions,
  type WorkspaceArea,
} from './novel-workspace/shell/workspace-types'
import './NovelProjectWorkspace.css'

type AnyRecord = Record<string, any>

const { Title, Text, Paragraph } = Typography

export default function NovelProjectWorkspace() {
  const navigate = useNavigate()
  const { id } = useParams()
  const projectId = Number(id)

  // ── 3-step writing flow ──
  const [stepOutlineLoading, setStepOutlineLoading] = useState(false)
  const [stepProseLoading, setStepProseLoading] = useState(false)
  const [stepRepairLoading, setStepRepairLoading] = useState(false)
  const [proseProgress, setProseProgress] = useState({ current: 0, total: 0 })
  const [proseBatchStatus, setProseBatchStatus] = useState<any>(null)
  const [planProgress, setPlanProgress] = useState<any>(null)
  const [planning, setPlanning] = useState(false)
  const [executingAgents, setExecutingAgents] = useState(false)
  const [generatingProse, setGeneratingProse] = useState(false)
  const [generatingSceneCards, setGeneratingSceneCards] = useState(false)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [incubatingOriginal, setIncubatingOriginal] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [editorReportLoading, setEditorReportLoading] = useState(false)
  const [proseQualityLoading, setProseQualityLoading] = useState(false)
  const [bookReviewLoading, setBookReviewLoading] = useState(false)
  const [writingBibleOpen, setWritingBibleOpen] = useState(false)
  const [writingBibleGenerating, setWritingBibleGenerating] = useState(false)
  const [styleSampleCandidateLoading, setStyleSampleCandidateLoading] = useState(false)
  const [styleSampleEffectivenessLoading, setStyleSampleEffectivenessLoading] = useState(false)
  const [styleSamplePatchLoadingKey, setStyleSamplePatchLoadingKey] = useState('')
  const [styleSampleEffectiveness, setStyleSampleEffectiveness] = useState<any | null>(null)
  const [storyStateOpen, setStoryStateOpen] = useState(false)
  const [commercialToolsOpen, setCommercialToolsOpen] = useState(false)
  const [creativeCommandOpen, setCreativeCommandOpen] = useState(false)
  const [creativeCommandText, setCreativeCommandText] = useState('')
  const [creativeCommandPlan, setCreativeCommandPlan] = useState<any | null>(null)
  const [creativeAssistantOpen, setCreativeAssistantOpen] = useState(false)
  const [creativeAssistantMode, setCreativeAssistantMode] = useState<CreativeAssistantModeKey>('prose_review')
  const [creativeAssistantLoading, setCreativeAssistantLoading] = useState(false)
  const [creativeAssistantResult, setCreativeAssistantResult] = useState<CreativeAssistResult | null>(null)
  const [creativeAssistantError, setCreativeAssistantError] = useState('')
  const [creativeAssistantSelectedText, setCreativeAssistantSelectedText] = useState('')
  const [backupImportOpen, setBackupImportOpen] = useState(false)
  const [backupImportText, setBackupImportText] = useState('')
  const [chapterGroupExecutingId, setChapterGroupExecutingId] = useState<number | null>(null)
  const [releaseRepairExecutingId, setReleaseRepairExecutingId] = useState<number | null>(null)
  const [commercialToolLoading, setCommercialToolLoading] = useState('')
  const [productionMode, setProductionMode] = useState('draft_review_revise_store')
  const [unattendedTargetChapter, setUnattendedTargetChapter] = useState(10)
  const [chapterWordTargetMode, setChapterWordTargetMode] = useState<ChapterWordTargetMode>('standard')
  const [chapterTargetWordCount, setChapterTargetWordCount] = useState(3000)
  const [activeChapterDiagnostics, setActiveChapterDiagnostics] = useState<ChapterOwnedData | null>(null)
  const diagnosticsRequestRef = useRef(0)
  const [activeChapterContextPackage, setActiveChapterContextPackage] = useState<ChapterOwnedData | null>(null)
  const [contextPackageLoading, setContextPackageLoading] = useState(false)
  const contextPackageRequestRef = useRef(0)
  const [commercialReadiness, setCommercialReadiness] = useState<any | null>(null)
  const [future100Draft, setFuture100Draft] = useState<any | null>(null)
  const [future100SelectedNos, setFuture100SelectedNos] = useState<number[]>([])
  const [future100ApplyLoading, setFuture100ApplyLoading] = useState(false)
  const [future100FocusOutlineIds, setFuture100FocusOutlineIds] = useState<number[]>([])
  const [projectSettings, setProjectSettings] = useState<any[]>([])
  const [memoryPalaceProjects, setMemoryPalaceProjects] = useState<any[] | null>(null)

  const chapterWordTargetPayload = () => ({
    word_target_mode: chapterWordTargetMode,
    ...(chapterWordTargetMode === 'custom' ? { target_word_count: chapterTargetWordCount } : {}),
  })

  const styleSampleEffectivenessItems = useMemo(() => (
    Array.isArray(styleSampleEffectiveness?.samples)
      ? styleSampleEffectiveness.samples.slice(0, 4)
      : []
  ), [styleSampleEffectiveness])

  // ── 大纲生成控制面板 ──
  const [outlinePanelOpen, setOutlinePanelOpen] = useState(false)
  const [referenceConfigOpen, setReferenceConfigOpen] = useState(false)
  const [referenceEngineeringOpen, setReferenceEngineeringOpen] = useState(false)
  const [creativeCardsOpen, setCreativeCardsOpen] = useState(false)
  const [consistencyGraphOpen, setConsistencyGraphOpen] = useState(false)
  const [qualityBenchmarkOpen, setQualityBenchmarkOpen] = useState(false)
  const [exportDeliveryOpen, setExportDeliveryOpen] = useState(false)
  const [reviewAnnotationsOpen, setReviewAnnotationsOpen] = useState(false)
  const [agentAuditOpen, setAgentAuditOpen] = useState(false)
  const [continuityAudit, setContinuityAudit] = useState<any | null>(null)
  const [continuityAuditLoading, setContinuityAuditLoading] = useState(false)

  // ── 章节弹出面板 ──
  const [chapterDrawerOpen, setChapterDrawerOpen] = useState(false)
  const [outlineTreeOpen, setOutlineTreeOpen] = useState(false)
  const [taskCenterOpen, setTaskCenterOpen] = useState(false)
  const [taskCenterRecoveryFocus, setTaskCenterRecoveryFocus] = useState<SafeBatchRecoveryFocusSnapshot | null>(null)

  // ── 章节多选 + 章节重组 ──
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [restructurePanelOpen, setRestructurePanelOpen] = useState(false)
  const [chapterSearch, setChapterSearch] = useState('')
  const [chapterStatusFilter, setChapterStatusFilter] = useState<ChapterStatusFilter>('all')
  const [chapterSortMode, setChapterSortMode] = useState<ChapterSortMode>('chapter_no_asc')

  // ── streaming ──
  const [streamingChapterId, setStreamingChapterId] = useState<number | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [streamingProgress, setStreamingProgress] = useState('')
  const [streamingPercent, setStreamingPercent] = useState(0)
  const [generationPipeline, setGenerationPipeline] = useState<any[]>([])
  const streamingEndRef = useRef<HTMLDivElement | null>(null)
  const proseBatchCancelRef = useRef(false)

  // ── editors / modals ──
  const [editorKind, setEditorKind] = useState<EditorKind | null>(null)
  const [editorItem, setEditorItem] = useState<any | null>(null)
  const [editorForm] = Form.useForm()
  const [writingBibleForm] = Form.useForm()
  const [storyStateForm] = Form.useForm()
  const [approvalPolicyForm] = Form.useForm()
  const [agentConfigForm] = Form.useForm()

  // ── right reference panel ──
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState('worldbuilding')
  const [workspaceArea, setWorkspaceArea] = useState<WorkspaceArea>('autoCreation')
  const [writingShellMode, setWritingShellMode] = useState<WorkspaceShellMode>(() => loadWorkspaceShellMode())
  const [directoryCollapsed, setDirectoryCollapsed] = useState(() => loadWorkbenchDirectoryCollapsed())
  const [storyAssetsFocusDiscoveredToken, setStoryAssetsFocusDiscoveredToken] = useState(0)
  const [autoDirectorActionLoadingKey, setAutoDirectorActionLoadingKey] = useState('')

  const shellMode = shellModeForWorkspaceArea(workspaceArea, writingShellMode)
  const isImmersiveShell = deriveIsImmersiveShell(shellMode, workspaceArea)
  const showGlobalWritingGuidance = workspaceArea !== 'chapterWriting'
  const directoryShellClassName = directoryCollapsed
    ? 'novel-workspace-directory-shell is-collapsed'
    : 'novel-workspace-directory-shell'

  const setShellMode = useCallback((mode: WorkspaceShellMode) => {
    setWritingShellMode(mode)
    saveWorkspaceShellMode(mode)
    if (mode === 'immersive') {
      const defaults = immersiveEnterPanelDefaults()
      setDirectoryCollapsed(defaults.directoryCollapsed)
      setRightPanelOpen(defaults.rightPanelOpen)
    } else {
      // restore workbench directory preference when leaving immersive
      setDirectoryCollapsed(loadWorkbenchDirectoryCollapsed())
    }
  }, [])

  // Apply immersive panel defaults only on false→true edge (e.g. restored preference
  // + land on chapterWriting). On true→false (area change OR toggle), restore workbench
  // directory preference so leaving chapterWriting while immersive does not keep the
  // directory collapsed. setShellMode('workbench') also restores — both are idempotent.
  const wasImmersiveRef = useRef(false)
  useEffect(() => {
    if (isImmersiveShell && !wasImmersiveRef.current) {
      const defaults = immersiveEnterPanelDefaults()
      setDirectoryCollapsed(defaults.directoryCollapsed)
      setRightPanelOpen(defaults.rightPanelOpen)
    } else if (!isImmersiveShell && wasImmersiveRef.current) {
      setDirectoryCollapsed(loadWorkbenchDirectoryCollapsed())
    }
    wasImmersiveRef.current = isImmersiveShell
  }, [isImmersiveShell])

  // Persist workbench directory fold when user toggles while not immersive
  const handleDirectoryCollapsedChange = useCallback((collapsed: boolean) => {
    setDirectoryCollapsed(collapsed)
    if (!isImmersiveShell) {
      saveWorkbenchDirectoryCollapsed(collapsed)
    }
  }, [isImmersiveShell])

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
  const handleOutlineGenerate = async (opts: { chapterCount: number; continueMode: boolean; continueFrom: number; userOutline: string }) => {
    if (!selectedModelId) return message.warning('请先在顶部选择模型')
    if (!await confirmReferenceReady('大纲生成')) return
    setStepOutlineLoading(true)
    setOutlinePanelOpen(false)
    try {
      const agents = ['market-agent', 'world-agent', 'character-agent', 'outline-agent', 'detail-outline-agent', 'continuity-check-agent']
      const payload: Record<string, any> = {
        chapterCount: opts.chapterCount,
        continueFrom: opts.continueMode ? opts.continueFrom : undefined,
        userOutline: opts.userOutline && opts.userOutline.trim() ? opts.userOutline.trim() : undefined,
      }
      const cleanPayload: Record<string, any> = {}
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) cleanPayload[k] = v
      }
      const res = await apiClient.post('/novel/agents/execute', {
        project_id: projectId, model_id: selectedModelId, agents,
        prompt: opts.userOutline && opts.userOutline.trim()
          ? '请基于用户提供的大纲，扩展生成完整的故事大纲和细纲。'
          : opts.continueMode
            ? `请从第 ${opts.continueFrom} 章之后继续生成大纲和细纲。`
            : '请生成世界观、角色、粗纲、细纲，并进行连续性预检。',
        payload: cleanPayload,
      })
      const execution = res.data || null
      setAgentExecution(execution)

      const summary = summarizeOutlineExecution(execution, opts.chapterCount)
      if (summary.failedSteps.length > 0) {
        const firstError = summary.outlineError || summary.detailError || summary.continuityError || summary.failedSteps[0]?.error || '生成失败'
        throw new Error(firstError)
      }
      if (!opts.continueMode && summary.requestedChapterCount > 0 && summary.actualCount > 0 && summary.actualCount !== summary.requestedChapterCount) {
        throw new Error(`细纲章数不符合预期：目标 ${summary.requestedChapterCount} 章，实际返回 ${summary.actualCount} 章`)
      }

      await loadProjectModules()
      message.success(`章节规划 + 连续性预检完成${summary.actualCount > 0 ? `（实际生成 ${summary.actualCount} 章）` : ''}`)
    } catch (e: any) {
      const errorCode = e?.response?.data?.error_code
      const backendMessage = e?.response?.data?.message
      const details = e?.response?.data?.details
      const mappedDetail = errorCode === 'OUTLINE_THEME_MISMATCH'
        ? '生成内容与当前项目主题不一致，系统已自动拦截。'
        : errorCode === 'OUTLINE_COUNT_MISMATCH'
          ? '生成的粗纲章节数与目标章数不一致。'
          : errorCode === 'DETAIL_OUTLINE_MISSING_INPUT'
            ? '粗纲未成功生成，因此无法继续展开细纲。'
            : errorCode === 'CONTINUITY_CHECK_FAILED'
              ? '连续性预检未通过。'
              : backendMessage
      const detail = mappedDetail || e?.response?.data?.detail || e?.response?.data?.error || e?.message || '大纲生成失败'
      message.error(detail)
      Modal.warning({
        title: '大纲生成未通过校验',
        content: details?.raw_error ? `${detail}\n\n原始原因：${details.raw_error}` : detail,
        width: 640,
      })
    } finally {
      setStepOutlineLoading(false)
    }
  }

  /* ── 正文生成 ──────────────────────────────────────────────────── */
  const stepGenerateProse = async (options?: { limit?: number; source?: string; longformCompass?: any; longformBattleContext?: any; chapterLaunchGate?: any; nextBatchBrief?: any; batchPreflight?: any; millionWordRunway?: any; allowedChapterNos?: number[] }) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    const allowedChapterNoSet = new Set((options?.allowedChapterNos || []).map(chapterNo => Number(chapterNo)).filter(Boolean))
    const allUnwrittenChapters = sortedChapters.filter(ch => !chapterHasProse(ch))
    const allUnwritten = allowedChapterNoSet.size > 0
      ? allUnwrittenChapters.filter(ch => allowedChapterNoSet.has(Number(ch.chapter_no || 0)))
      : allUnwrittenChapters
    const safetyLimit = Math.max(0, Number(options?.limit || 0))
    const unWritten = safetyLimit > 0 ? allUnwritten.slice(0, safetyLimit) : allUnwritten
    if (allUnwrittenChapters.length === 0) return message.warning('所有章节已有正文，无需生成')
    if (allUnwritten.length === 0) return message.warning('当前护栏放行的章节没有可生成正文')
    if (unWritten.length === 0) return message.warning('当前安全批次没有可生成章节')
    if (!await confirmReferenceReady('正文创作')) return
    setStepProseLoading(true)
    proseBatchCancelRef.current = false
    setProseBatchStatus({ success: 0, failed: 0, currentTitle: '', lastError: '', lastQuality: '' })
    let success = 0
    let failed = 0
    const errors: string[] = []
    const batchStartedAt = Date.now()
    const batchChapters: any[] = []
    try {
      for (let index = 0; index < unWritten.length; index += 1) {
        if (proseBatchCancelRef.current) break
        const ch = unWritten[index]
        const currentTitle = `第 ${ch.chapter_no} 章《${displayValue(ch.title)}》`
        setProseProgress({ current: index + 1, total: unWritten.length })
        setProseBatchStatus({ success, failed, currentTitle, lastError: '', lastQuality: '' })
        try {
          const resp = await fetch(`${apiClient.defaults.baseURL}/novel/chapters/${ch.id}/generate-prose`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              model_id: selectedModelId,
              ...chapterWordTargetPayload(),
              longform_compass: options?.longformCompass,
              longform_battle_context: options?.longformBattleContext,
              chapter_launch_gate: options?.chapterLaunchGate,
              next_batch_brief: options?.nextBatchBrief,
              batch_preflight: options?.batchPreflight,
              million_word_runway: options?.millionWordRunway,
              prompt: `请生成第 ${ch.chapter_no} 章《${displayValue(ch.title)}》完整正文`,
            }),
          })
          const raw = await resp.text()
          let data: any = null
          try { data = raw ? JSON.parse(raw) : null } catch { data = null }
          if (!resp.ok) {
            if (data?.error_code === 'PROSE_PREFLIGHT_BLOCKED' || data?.error_code === 'REFERENCE_SAFETY_BLOCKED') {
              showGenerationBlockedModal(data, undefined, { targetChapterId: ch.id })
            }
            throw new Error(data?.error || data?.detail || raw || `HTTP ${resp.status}`)
          }
          success += 1
          const score = data?.self_check?.review?.score
          const revised = data?.self_check?.revised
          batchChapters.push({
            id: ch.id,
            chapter_no: ch.chapter_no,
            title: displayValue(ch.title),
            status: 'success',
            score,
            revised: Boolean(revised),
            word_count: data?.chapter?.chapter_text ? String(data.chapter.chapter_text).replace(/\s/g, '').length : undefined,
          })
          if (Array.isArray(data?.pipeline)) setGenerationPipeline(data.pipeline)
          setProseBatchStatus({
            success,
            failed,
            currentTitle,
            lastError: '',
            lastQuality: score !== undefined ? `最近质检：${score} 分${revised ? '，已修订' : ''}` : '',
          })
        } catch (error: any) {
          failed += 1
          const messageText = `${currentTitle}：${error?.message || '生成失败'}`
          errors.push(messageText)
          batchChapters.push({
            id: ch.id,
            chapter_no: ch.chapter_no,
            title: displayValue(ch.title),
            status: 'failed',
            error: error?.message || '生成失败',
          })
          setProseBatchStatus({ success, failed, currentTitle, lastError: messageText, lastQuality: '' })
        }
        if (proseBatchCancelRef.current) break
      }
      const canceled = proseBatchCancelRef.current
      const skipped = Math.max(0, unWritten.length - success - failed)
      try {
        await apiClient.post('/novel/runs', {
          project_id: projectId,
          run_type: 'batch_generate_prose',
          step_name: 'summary',
          status: canceled ? 'canceled' : failed > 0 ? 'warn' : 'success',
          input_ref: {
            model_id: selectedModelId,
            chapter_ids: unWritten.map(ch => ch.id),
            total: unWritten.length,
            source: options?.source || 'manual_batch',
            longform_compass: options?.longformCompass,
            longform_battle_context: options?.longformBattleContext,
            chapter_launch_gate: options?.chapterLaunchGate,
            next_batch_brief: options?.nextBatchBrief,
            batch_preflight: options?.batchPreflight,
            million_word_runway: options?.millionWordRunway,
            allowed_chapter_nos: Array.from(allowedChapterNoSet),
            safety_limit: safetyLimit || null,
            available_total: allUnwritten.length,
          },
          output_ref: {
            total: unWritten.length,
            success,
            failed,
            skipped,
            canceled,
            chapters: batchChapters,
            errors,
          },
          duration_ms: Date.now() - batchStartedAt,
          error_message: errors.slice(0, 5).join('\n'),
        })
      } catch {
        // 汇总记录写入失败不影响已经生成的章节正文。
      }
      await loadProjectModules()
      if (success > 0) {
        setRightPanelOpen(true)
        setRightPanelTab('proseQuality')
      }
      if (canceled) {
        message.warning(`已停止批量生成：成功 ${success} 章，失败 ${failed} 章，未处理 ${skipped} 章`)
      } else if (failed > 0) {
        message.warning(`正文批量生成完成：成功 ${success} 章，失败 ${failed} 章`)
        Modal.warning({
          title: '部分章节生成失败',
          width: 680,
          content: (
            <div style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto' }}>
              {errors.slice(0, 20).join('\n')}
              {errors.length > 20 ? `\n... 另有 ${errors.length - 20} 条失败` : ''}
            </div>
          ),
        })
      } else {
        message.success(safetyLimit > 0
          ? `安全连写完成 (${success}/${unWritten.length})`
          : `正文生成完成 (${success}/${unWritten.length})`)
      }
    } catch (e: any) { message.error(e.message || '正文生成失败') }
    finally {
      setStepProseLoading(false)
      setProseProgress({ current: 0, total: 0 })
      proseBatchCancelRef.current = false
    }
  }

  const stepRunRepair = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    setStepRepairLoading(true)
    try {
      const res = await apiClient.post('/novel/agents/repair', {
        project_id: projectId, model_id: selectedModelId, payload: {},
      })
      await loadProjectModules()
      message.success(`连续性修复完成，发现 ${res.data?.issues_found || 0} 个问题`)
    } catch (e: any) { message.error(e.response?.data?.detail || '修复失败') }
    finally { setStepRepairLoading(false) }
  }

  /* ── Plan (AI 一键初始化) ──────────────────────────────────────── */
  const runPlan = async () => {
    if (!await flushPendingSave()) return
    if (!await confirmReferenceReady('全案规划')) return
    setPlanning(true)
    setPlanProgress(null)
    try {
      const response = await fetch(`${apiClient.defaults.baseURL}/novel/plan?stream=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          project_id: projectId, model_id: selectedModelId,
          prompt: '请规划小说的基础三项：世界观、角色、大纲。请先产出这三项的核心内容与结构，不要直接进入正文。',
          payload: { scope: 'foundation', items: ['worldbuilding', 'characters', 'outlines'] },
        }),
      })
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalData: any = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'progress') setPlanProgress(data)
            else if (data.type === 'done') finalData = data.data
            else if (data.type === 'error') throw new Error(data.error)
          } catch { /* skip */ }
        }
      }
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6))
          if (data.type === 'done') finalData = data.data
          else if (data.type === 'progress') setPlanProgress(data)
          else if (data.type === 'error') throw new Error(data.error)
        } catch { /* skip */ }
      }
      await loadProjectModules()
      message.success('规划已完成')
    } catch (err: any) { message.error(err.message || '规划失败') }
    finally { setPlanning(false); setPlanProgress(null) }
  }

  const executeAgents = async () => {
    if (!await flushPendingSave()) return
    setExecutingAgents(true)
    try {
      const res = await apiClient.post('/novel/agents/execute', {
        project_id: projectId, model_id: selectedModelId,
        prompt: '执行小说Agent链', payload: {},
      })
      setAgentExecution(res.data || null)
      await loadProjectModules()
      message.success('生成流程已完成')
    } catch (error: any) {
      message.error(error.response?.data?.detail || error.response?.data?.error || '执行失败')
    } finally { setExecutingAgents(false) }
  }

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

  const buildPreDraftBriefForActiveChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setCommercialToolLoading('preDraftBrief')
    try {
      const res = await apiClient.get(`/novel/chapters/${activeChapter.id}/pre-draft-brief`, {
        params: { project_id: projectId },
      })
      const brief = res.data?.brief || {}
      const saveRes = await apiClient.put(`/novel/chapters/${activeChapter.id}/pre-draft-brief`, {
        project_id: projectId,
        brief,
      })
      if (saveRes.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === saveRes.data.chapter.id ? saveRes.data.chapter : c))
      }
      await loadProjectModules()
      message.success('章节开写任务书已生成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务书生成失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const confirmPreDraftBriefForActiveChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setCommercialToolLoading('preDraftBriefConfirm')
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/pre-draft-brief/confirm`, {
        project_id: projectId,
        brief: activeChapter.raw_payload?.pre_draft_brief || activeChapter.raw_payload?.preDraftBrief,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      message.success('章节开写任务书已确认')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务书确认失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const savePreDraftBriefForActiveChapter = async (brief: any) => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setCommercialToolLoading('preDraftBrief')
    try {
      const res = await apiClient.put(`/novel/chapters/${activeChapter.id}/pre-draft-brief`, {
        project_id: projectId,
        brief,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      message.success('章节开写任务书已保存')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务书保存失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const applyStyleSampleActionForChapter = async (targetChapter: any, action: 'lock' | 'replace' | 'disable', successMessage = '') => {
    if (!targetChapter?.id) {
      message.warning('请先选择章节')
      return false
    }
    if (Number(activeChapter?.id || 0) === Number(targetChapter.id)) {
      if (!await flushPendingSave()) return false
    } else if (!await selectChapterForWriting(Number(targetChapter.id))) {
      return false
    }
    const loadingKey = action === 'lock' ? 'styleSampleLock' : action === 'replace' ? 'styleSampleReplace' : 'styleSampleDisable'
    setCommercialToolLoading(loadingKey)
    try {
      const res = await apiClient.post(`/novel/chapters/${targetChapter.id}/pre-draft-brief/style-samples`, {
        project_id: projectId,
        action,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      if (successMessage) message.success(successMessage)
      else if (action === 'lock') message.success('本章风格样章已锁定')
      else if (action === 'replace') message.success('已换一组风格样章，请重新确认任务书')
      else if (action === 'disable') message.success('本章已不用风格样章，请重新确认任务书')
      return true
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '风格样章操作失败')
      return false
    } finally {
      setCommercialToolLoading('')
    }
  }

  const applyStyleSampleActionForActiveChapter = async (action: 'lock' | 'replace' | 'disable') => {
    return applyStyleSampleActionForChapter(activeChapter, action)
  }

  const openGenerationDiagnostics = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setDiagnosticsLoading(true)
    try {
      const res = await apiClient.get(`/novel/chapters/${activeChapter.id}/generation-diagnostics`, {
        params: { project_id: projectId },
      })
      showDiagnosticsModal(res.data || {})
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成前诊断失败')
    } finally {
      setDiagnosticsLoading(false)
    }
  }

  const openChapterQualityCardForChapter = async (chapterId: number) => {
    try {
      const res = await apiClient.get(`/novel/chapters/${chapterId}/quality-card`, { params: { project_id: projectId } })
      const card = res.data?.quality_card || {}
      Modal.info({
        title: '章节交稿质检',
        width: 900,
        content: renderChapterQualityCardContentView(card),
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节交稿质检加载失败')
    }
  }

  const openChapterQualityCard = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    await openChapterQualityCardForChapter(Number(activeChapter.id))
  }

  const openProductionDashboard = async () => {
    if (!selectedProject) return
    setDashboardLoading(true)
    try {
      const [dashboardRes, assetsRes, strategyRes, readinessRes, matrixRes, governanceRes] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}/production-dashboard`),
        apiClient.get(`/novel/projects/${projectId}/writing-assets`).catch(() => ({ data: null })),
        apiClient.get(`/novel/projects/${projectId}/model-strategy`, { params: { model_id: selectedModelId } }).catch(() => ({ data: null })),
        apiClient.get(`/novel/projects/${projectId}/commercial-readiness`).catch(() => ({ data: null })),
        apiClient.get(`/novel/projects/${projectId}/chapter-material-matrix`, { params: { limit: 120, unwritten_only: 0 } }).catch(() => ({ data: null })),
        apiClient.get(`/novel/projects/${projectId}/longform-governance-summary`).catch(() => ({ data: null })),
      ])
      const dashboard = dashboardRes.data?.dashboard || {}
      const assets = assetsRes.data?.assets || []
      const strategy = strategyRes.data?.strategy || {}
      const readiness = readinessRes.data?.readiness || null
      const materialMatrix = matrixRes.data || null
      const governance = governanceRes.data?.summary || null
      if (readiness) setCommercialReadiness(readiness)
      Modal.info({
        title: '生产看板',
        width: 900,
        content: renderProductionDashboardContentView({
          dashboard,
          readiness,
          governance,
          materialMatrix,
          assets,
          strategy,
        }, {
          onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
        }),
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生产看板加载失败')
    } finally {
      setDashboardLoading(false)
    }
  }

  const runOriginalIncubator = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    Modal.confirm({
      title: '原创项目孵化',
      width: 640,
      content: '系统会先生成可预览的原创方案，包括世界观、角色、分卷、前 30 章章纲、写作圣经和商业定位。确认后才入库，已有相同章号的章节不会覆盖。',
      okText: '生成预览',
      onOk: async () => {
        setIncubatingOriginal(true)
        try {
          const res = await apiClient.post(`/novel/projects/${projectId}/incubate-original`, {
            model_id: selectedModelId,
            chapter_count: 30,
            variant_count: 3,
            auto_store: false,
          })
          const payload = res.data?.payload || {}
          const hasIncubatorContent = Boolean(
            (Array.isArray(payload.directions) && payload.directions.length > 0)
              || payload.selected_direction
              || payload.worldbuilding?.world_summary
              || (Array.isArray(payload.characters) && payload.characters.length > 0)
              || (Array.isArray(payload.outlines) && payload.outlines.length > 0)
              || (Array.isArray(payload.chapters) && payload.chapters.length > 0)
              || payload.commercial_positioning?.reader_promise
              || (Array.isArray(payload.commercial_positioning?.selling_points) && payload.commercial_positioning.selling_points.length > 0),
          )
          if (!hasIncubatorContent) {
            Modal.error({
              title: '原创孵化没有生成有效内容',
              width: 720,
              content: renderOriginalIncubationEmptyErrorContentView({
                error: '模型返回了空方案，系统已阻止入库。请重试、切换模型，或先补充项目简介/题材/目标读者。',
                raw_preview: res.data?.raw_preview,
              }),
            })
            return
          }
          Modal.confirm({
            title: '确认原创孵化方案',
            width: 860,
            content: renderOriginalIncubationPreviewContentView(payload),
            okText: '确认入库',
            cancelText: '放弃',
            onOk: async () => {
              await apiClient.post(`/novel/projects/${projectId}/incubate-original/commit`, { payload, chapter_count: 30 })
              await loadProjectModules()
              setRightPanelOpen(true)
              setRightPanelTab('writingBible')
              message.success('原创孵化已入库')
            },
          })
        } catch (error: any) {
          const data = error?.response?.data || {}
          if (data.error_code === 'ORIGINAL_INCUBATION_EMPTY') {
            Modal.error({
              title: '原创孵化没有生成有效内容',
              width: 760,
              content: renderOriginalIncubationEmptyErrorContentView(data),
            })
          } else {
            message.error(data.error || error?.message || '原创孵化失败')
          }
        } finally {
          setIncubatingOriginal(false)
        }
      },
    })
  }

  const startChapterGroupGeneration = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/start`, {
        model_id: selectedModelId,
        start_chapter: activeChapter?.chapter_no || undefined,
        count: 10,
        production_mode: productionMode,
        ...chapterWordTargetPayload(),
        require_scene_confirmation: productionMode !== 'scene_cards_only',
      })
      await loadProjectModules()
      setTaskCenterOpen(true)
      message.success('章节群任务已创建，可在任务中心查看并逐章推进')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节群任务创建失败')
    }
  }

  const startReadyChapterGroupGeneration = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    setCommercialToolLoading('readyGroup')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/chapter-groups/start-ready`, {
        model_id: selectedModelId,
        start_chapter: activeChapter?.chapter_no || undefined,
        scan_limit: 60,
        count: 10,
        min_score: 65,
        production_mode: productionMode,
        ...chapterWordTargetPayload(),
        require_scene_confirmation: productionMode !== 'scene_cards_only',
      })
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      message.success(`已创建智能章节群：入队 ${res.data?.summary?.queued || 0} 章，跳过 ${res.data?.summary?.skipped || 0} 章`)
    } catch (error: any) {
      const payload = error?.response?.data
      if (payload?.error_code === 'NO_READY_CHAPTERS') {
        Modal.warning({
          title: '没有可入队章节',
          width: 760,
          content: (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text>已扫描 {payload.scanned || 0} 章，但没有达到材料阈值 {payload.min_score || 65}% 的待生成章节。</Text>
              <List
                size="small"
                dataSource={(payload.skipped || []).slice(0, 8)}
                renderItem={(row: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`第${row.chapter_no}章《${row.title || '未命名'}》 · ${row.score}%`}
                      description={(row.recommendations || []).slice(0, 2).join('；') || '材料不足'}
                    />
                  </List.Item>
                )}
              />
            </Space>
          ),
        })
      } else {
        message.error(payload?.error || error?.message || '智能章节群创建失败')
      }
    } finally {
      setCommercialToolLoading('')
    }
  }

  const startFuture100ChapterGroupGeneration = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    setCommercialToolLoading('future100Group')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/chapter-groups/start-from-skeleton`, {
        model_id: selectedModelId,
        start_chapter: activeChapter?.chapter_no || undefined,
        scan_limit: 100,
        count: 10,
        min_score: 70,
        create_missing: true,
        sync_chapter_fields: true,
        production_mode: productionMode,
        ...chapterWordTargetPayload(),
        require_scene_confirmation: productionMode !== 'scene_cards_only',
      })
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      message.success(`已从未来100章骨架入队：${res.data?.summary?.queued || 0} 章，创建 ${res.data?.summary?.created || 0} 章，更新 ${res.data?.summary?.updated || 0} 章`)
    } catch (error: any) {
      const payload = error?.response?.data
      if (payload?.error_code === 'NO_READY_SKELETON_CHAPTERS') {
        Modal.warning({
          title: '没有可从骨架入队的章节',
          width: 760,
          content: (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text>已扫描 {payload.scanned || 0} 条骨架，但没有达到骨架阈值 {payload.min_score || 70}% 的待生成章节。</Text>
              <List
                size="small"
                dataSource={(payload.skipped || []).slice(0, 10)}
                renderItem={(row: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`第${row.chapter_no}章《${row.title || '未命名'}》 · 骨架分 ${row.skeleton_score || 0}`}
                      description={(row.blockers || []).join('；') || '暂不可入队'}
                    />
                  </List.Item>
                )}
              />
            </Space>
          ),
        })
      } else {
        message.error(payload?.error || error?.message || '从未来100章骨架入队失败')
      }
    } finally {
      setCommercialToolLoading('')
    }
  }

  const startUnattendedWritingGoal = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    const startChapter = Number(activeChapter?.chapter_no || sortedChapters.find((chapter: any) => !chapterHasProse(chapter))?.chapter_no || 1)
    if (!Number(unattendedTargetChapter || 0) || Number(unattendedTargetChapter) < startChapter) {
      return message.warning(`目标章号需要不小于第${startChapter}章`)
    }
    setCommercialToolLoading('unattendedGoal')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/chapter-groups/start-unattended`, {
        model_id: selectedModelId,
        start_chapter: startChapter,
        target_chapter: unattendedTargetChapter,
        create_missing: true,
        sync_chapter_fields: true,
        allow_incomplete: false,
        force_scene_cards: true,
        ...chapterWordTargetPayload(),
      })
      await apiClient.post(`/novel/projects/${projectId}/run-queue/start-worker`, {
        model_id: selectedModelId,
        max_runs: Math.max(1, Number(unattendedTargetChapter || 0) - startChapter + 2),
        max_chapters_per_run: 1,
        idle_wait_ms: 300000,
        idle_poll_ms: 1000,
        production_mode: 'full_auto',
        allow_incomplete: false,
        force_scene_cards: true,
        ...chapterWordTargetPayload(),
      })
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      message.success(`无人值守已启动：目标第${res.data?.summary?.target_chapter || unattendedTargetChapter}章，入队 ${res.data?.summary?.queued || 0} 章`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '无人值守启动失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

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

  const fillWritingBibleForm = (bible: any) => {
    const styleLock = mergeCommercialWebNovelStyleDefaults(bible.style_lock || selectedProject?.reference_config?.style_lock || {})
    const styleSampleBank = mergeCommercialWebNovelStyleSampleDefaults(bible.style_sample_bank || selectedProject?.reference_config?.style_sample_bank || [])
    writingBibleForm.setFieldsValue({
      reader_promise: bible.reader_promise || bible.readerPromise || bible.promise || '',
      protagonist_drive: bible.protagonist_drive || bible.protagonistDrive || bible.protagonist_motivation || bible.main_character_drive || '',
      core_conflict: bible.core_conflict || bible.coreConflict || bible.main_conflict || bible.mainline?.conflict || bible.mainline?.core_conflict || '',
      current_volume_goal: bible.current_volume_goal || bible.currentVolumeGoal || bible.volume_goal || bible.volume_plan?.[0]?.goal || bible.volume_plan?.[0]?.summary || '',
      innovation_hook: bible.innovation_hook || bible.innovationHook || bible.original_hook || bible.unique_selling_point || '',
      first30_plan: bible.first30_plan || bible.first30Plan || bible.first_30_plan || bible.opening_strategy || bible.retention_plan || '',
      longform_capacity: bible.longform_capacity || bible.longformCapacity || bible.million_word_spine || bible.longform_spine || bible.serial_engine || '',
      promise: bible.promise || bible.reader_promise || '',
      narrative_person: styleLock.narrative_person || '',
      sentence_length: styleLock.sentence_length || '',
      dialogue_ratio: styleLock.dialogue_ratio || '',
      payoff_density: styleLock.payoff_density || '',
      description_density: styleLock.description_density || '',
      chapter_word_range: styleLock.chapter_word_range || '',
      banned_words: Array.isArray(styleLock.banned_words) ? styleLock.banned_words.join('\n') : '',
      preferred_words: Array.isArray(styleLock.preferred_words) ? styleLock.preferred_words.join('\n') : '',
      world_rules: JSON.stringify(bible.world_rules || [], null, 2),
      mainline: JSON.stringify(bible.mainline || {}, null, 2),
      volume_plan: JSON.stringify(bible.volume_plan || [], null, 2),
      style_lock: JSON.stringify(styleLock || {}, null, 2),
      safety_policy: JSON.stringify(bible.safety_policy || selectedProject?.reference_config?.safety || {}, null, 2),
      forbidden: JSON.stringify(bible.forbidden || [], null, 2),
      meme_bank: JSON.stringify(bible.meme_bank || selectedProject?.reference_config?.meme_bank || [], null, 2),
      style_sample_bank: JSON.stringify(styleSampleBank, null, 2),
      chapter_benchmark_sample_bank: JSON.stringify(bible.chapter_benchmark_sample_bank || selectedProject?.reference_config?.chapter_benchmark_sample_bank || [], null, 2),
    })
  }

  const fillDefaultStyleSampleBank = () => {
    writingBibleForm.setFieldsValue({
      style_sample_bank: JSON.stringify(mergeCommercialWebNovelStyleSampleDefaults([]), null, 2),
    })
    message.success('已填入默认风格样本库')
  }

  const extractStyleSampleCandidates = async () => {
    setStyleSampleCandidateLoading(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-candidates`, {
        min_score: 86,
        limit: 6,
      })
      const candidates = Array.isArray(res.data?.candidates) ? res.data.candidates : []
      if (!candidates.length) {
        message.warning('暂未找到可提炼的高分章节')
        return
      }
      writingBibleForm.setFieldsValue({
        style_sample_bank: JSON.stringify(candidates, null, 2),
      })
      message.success(`已提炼 ${candidates.length} 条风格样本候选，请审阅后保存`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '风格样本候选提炼失败')
    } finally {
      setStyleSampleCandidateLoading(false)
    }
  }

  const openWritingBibleEditor = async () => {
    setStyleSampleEffectivenessLoading(true)
    setStyleSampleEffectiveness(null)
    try {
      const [res, effectivenessRes] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}/writing-bible`),
        apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null),
      ])
      const bible = res.data?.writing_bible || {}
      fillWritingBibleForm(bible)
      setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || null)
      setWritingBibleOpen(true)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '写作圣经加载失败')
    } finally {
      setStyleSampleEffectivenessLoading(false)
    }
  }

  const previewStyleSampleAdjustmentPatch = async (item: any) => {
    const sampleKey = String(item?.sample_key || '').trim()
    if (!sampleKey) return message.warning('缺少样章键')
    setStyleSamplePatchLoadingKey(sampleKey)
    try {
      const previewRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustment`, {
        sample_key: sampleKey,
        dry_run: true,
      })
      const patch = previewRes.data?.style_sample_patch || item?.adjustment_patch || {}
      const patchText = patch.patch_json || JSON.stringify(patch, null, 2)
      Modal.confirm({
        title: '样章补丁预览',
        width: 760,
        okText: '应用补丁',
        cancelText: '暂不应用',
        content: renderStyleSamplePatchPreviewContentView(sampleKey, patchText),
        onOk: async () => {
          try {
            const applyRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustment`, {
              sample_key: sampleKey,
              dry_run: false,
            })
            const nextBible = applyRes.data?.writing_bible || applyRes.data?.project?.reference_config?.writing_bible
            const nextBank = nextBible?.style_sample_bank || applyRes.data?.project?.reference_config?.style_sample_bank
            if (Array.isArray(nextBank)) {
              writingBibleForm.setFieldsValue({
                style_sample_bank: JSON.stringify(nextBank, null, 2),
              })
            }
            if (applyRes.data?.project) {
              setSelectedProject((prev: any) => prev ? { ...prev, ...applyRes.data.project } : applyRes.data.project)
            }
            const effectivenessRes = await apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null)
            setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || styleSampleEffectiveness)
            message.success('样章补丁已应用，请检查 JSON 后保存写作圣经')
          } catch (error: any) {
            message.error(error?.response?.data?.error || error?.message || '样章补丁应用失败')
            throw error
          }
        },
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章补丁预览失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const previewStyleSampleAdjustmentBatch = async () => {
    const riskyCount = Number(styleSampleEffectiveness?.risky_sample_count || 0)
    if (riskyCount <= 0) return message.info('当前没有需复盘样章')
    setStyleSamplePatchLoadingKey('batch')
    try {
      const previewRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments`, {
        dry_run: true,
      })
      const batch = previewRes.data?.style_sample_patch_batch || {}
      const patchText = batch.patch_json || JSON.stringify(batch, null, 2)
      Modal.confirm({
        title: '样章批量补丁预览',
        width: 820,
        okText: '应用全部补丁',
        cancelText: '暂不应用',
        content: (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`将批量调整 ${batch.total_patch_count || riskyCount} 条需复盘样章`}
              description="批量补丁只处理需复盘样章，跳过表现稳定样章；确认后写回风格样章库，不会改正文。"
            />
            <Input.TextArea value={patchText} rows={14} readOnly />
          </Space>
        ),
        onOk: async () => {
          try {
            const applyRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments`, {
              dry_run: false,
            })
            const nextBible = applyRes.data?.writing_bible || applyRes.data?.project?.reference_config?.writing_bible
            const nextBank = nextBible?.style_sample_bank || applyRes.data?.project?.reference_config?.style_sample_bank
            if (Array.isArray(nextBank)) {
              writingBibleForm.setFieldsValue({
                style_sample_bank: JSON.stringify(nextBank, null, 2),
              })
            }
            if (applyRes.data?.project) {
              setSelectedProject((prev: any) => prev ? { ...prev, ...applyRes.data.project } : applyRes.data.project)
            }
            const effectivenessRes = await apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null)
            setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || styleSampleEffectiveness)
            message.success('样章批量补丁已应用，请检查 JSON 后保存写作圣经')
          } catch (error: any) {
            message.error(error?.response?.data?.error || error?.message || '样章批量补丁应用失败')
            throw error
          }
        },
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章批量补丁预览失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const undoStyleSampleAdjustmentPatch = async () => {
    setStyleSamplePatchLoadingKey('undo')
    try {
      const undoRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments/undo`)
      if (!undoRes.data?.changed) {
        message.info('暂无可撤销的样章补丁')
        return
      }
      const nextBible = undoRes.data?.writing_bible || undoRes.data?.project?.reference_config?.writing_bible
      const nextBank = nextBible?.style_sample_bank || undoRes.data?.project?.reference_config?.style_sample_bank
      if (Array.isArray(nextBank)) {
        writingBibleForm.setFieldsValue({
          style_sample_bank: JSON.stringify(nextBank, null, 2),
        })
      }
      if (undoRes.data?.project) {
        setSelectedProject((prev: any) => prev ? { ...prev, ...undoRes.data.project } : undoRes.data.project)
      }
      const effectivenessRes = await apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null)
      setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || styleSampleEffectiveness)
      message.success('样章补丁已撤销')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章补丁撤销失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const repairStyleSamplePatchReviewSelection = async (review: any = {}) => {
    const repairAction = review?.recommended_repair_action || review?.recommendedRepairAction || {}
    if (repairAction?.action !== 'replace') return
    if (!activeChapter) {
      message.warning('请先选择要重审任务书的章节')
      return
    }
    await applyStyleSampleActionForActiveChapter('replace')
    setWritingBibleOpen(false)
    setWorkspaceArea('chapterWriting')
    setRightPanelOpen(false)
  }

  const reviewStyleSampleAdjustmentPatch = async () => {
    setStyleSamplePatchLoadingKey('review')
    try {
      const contextPackage = activeContextPackageData?.context_package || activeContextPackageData || null
      const nextStyleSampleStrategy = activeChapter?.raw_payload?.pre_draft_brief?.style_sample_strategy
        || activeChapter?.raw_payload?.preDraftBrief?.style_sample_strategy
        || activeChapter?.raw_payload?.preDraftBrief?.styleSampleStrategy
        || contextPackage?.pre_draft_brief?.style_sample_strategy
        || contextPackage?.preDraftBrief?.style_sample_strategy
        || contextPackage?.preDraftBrief?.styleSampleStrategy
        || contextPackage?.chapter_target?.style_sample_strategy
        || contextPackage?.chapter_target?.styleSampleStrategy
        || null
      const reviewRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments/post-apply-review`, {
        chapter_id: activeChapter?.id || null,
        chapter_no: activeChapter?.chapter_no || null,
        context_package: contextPackage,
        next_style_sample_strategy: nextStyleSampleStrategy,
      })
      const review = reviewRes.data?.style_sample_patch_review || {}
      setStyleSampleEffectiveness(reviewRes.data?.style_sample_effectiveness || reviewRes.data?.report || styleSampleEffectiveness)
      const status = review.status || 'empty'
      const repairAction = review.recommended_repair_action || review.recommendedRepairAction || null
      const repairActionLabel = '换样章并重审任务书'
      const reviewOkText = repairAction?.action === 'replace'
        ? (repairAction.label || repairActionLabel)
        : '知道了'
      const messageText = status === 'warn'
        ? '当前任务书仍选中了复盘风险样章'
        : status === 'ok'
          ? '样章补丁复检通过'
          : status === 'watch'
            ? '样章补丁进入观察'
            : '暂无可复检的样章补丁'
      Modal.info({
        title: '样章补丁复检',
        width: 760,
        content: (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Alert
              type={status === 'warn' ? 'warning' : status === 'ok' ? 'success' : 'info'}
              showIcon
              message={messageText}
              description={(Array.isArray(review.next_actions) ? review.next_actions : []).join('；') || '请先应用样章补丁，再复检任务书是否还会选择风险样章。'}
            />
            <Space size={6} wrap>
              <Tag bordered={false}>补丁样章 {(review.patched_sample_keys || []).length || 0}</Tag>
              <Tag color={(review.still_risky_sample_keys || []).length ? 'orange' : 'green'} bordered={false}>仍需观察 {(review.still_risky_sample_keys || []).length || 0}</Tag>
              <Tag color={review.next_task_selects_repatched_risky_sample ? 'red' : 'green'} bordered={false}>
                任务书选中风险 {review.next_task_selects_repatched_risky_sample ? '是' : '否'}
              </Tag>
            </Space>
            <Input.TextArea value={JSON.stringify(review, null, 2)} rows={10} readOnly />
          </Space>
        ),
        okText: reviewOkText,
        onOk: async () => {
          if (repairAction?.action === 'replace') {
            await repairStyleSamplePatchReviewSelection(review)
          }
        },
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章补丁复检失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const generateWritingBibleEditor = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setWritingBibleGenerating(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/writing-bible/generate`, {
        model_id: selectedModelId,
        save: true,
      })
      const bible = res.data?.writing_bible || {}
      fillWritingBibleForm(bible)
      setSelectedProject((prev: any) => res.data?.project || (prev ? { ...prev, reference_config: { ...(prev.reference_config || {}), writing_bible: bible } } : prev))
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('writingBible')
      message.success('写作圣经已自动生成并保存，可继续人工微调')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '写作圣经自动生成失败')
    } finally {
      setWritingBibleGenerating(false)
    }
  }

  const saveWritingBibleEditor = async () => {
    try {
      const v = await writingBibleForm.validateFields()
      const parseJson = (value: string, fallback: any) => {
        try { return JSON.parse(value || '') } catch { return fallback }
      }
      const parsedStyleLock = parseJson(v.style_lock, {})
      const memeBank = parseJson(v.meme_bank, [])
      const styleSampleBank = mergeCommercialWebNovelStyleSampleDefaults(parseJson(v.style_sample_bank, []))
      const chapterBenchmarkSampleBank = parseJson(v.chapter_benchmark_sample_bank, [])
      const writingBible = {
        ...(selectedProject?.reference_config?.writing_bible || {}),
        reader_promise: v.reader_promise || v.promise || '',
        protagonist_drive: v.protagonist_drive || '',
        core_conflict: v.core_conflict || '',
        current_volume_goal: v.current_volume_goal || '',
        innovation_hook: v.innovation_hook || '',
        first30_plan: v.first30_plan || '',
        longform_capacity: v.longform_capacity || '',
        promise: v.promise || v.reader_promise || '',
        world_rules: parseJson(v.world_rules, []),
        mainline: parseJson(v.mainline, {}),
        volume_plan: parseJson(v.volume_plan, []),
        style_lock: {
          ...parsedStyleLock,
          narrative_person: v.narrative_person || '',
          sentence_length: v.sentence_length || '',
          dialogue_ratio: v.dialogue_ratio || '',
          payoff_density: v.payoff_density || '',
          description_density: v.description_density || '',
          chapter_word_range: v.chapter_word_range || '',
          banter_density: parsedStyleLock.banter_density || '',
          ending_policy: parsedStyleLock.ending_policy || '',
          banned_words: parseListField(v.banned_words),
          preferred_words: parseListField(v.preferred_words),
          banned_shortcuts: parsedStyleLock.banned_shortcuts || [],
        },
        safety_policy: parseJson(v.safety_policy, {}),
        forbidden: parseJson(v.forbidden, []),
        meme_bank: memeBank,
        style_sample_bank: styleSampleBank,
        chapter_benchmark_sample_bank: chapterBenchmarkSampleBank,
      }
      const res = await apiClient.put(`/novel/projects/${projectId}/writing-bible`, { writing_bible: writingBible })
      const nextReferenceConfig = {
        ...(selectedProject?.reference_config || {}),
        ...(res.data?.project?.reference_config || {}),
        writing_bible: res.data?.writing_bible || writingBible,
        meme_bank: Array.isArray(memeBank) ? memeBank : [],
        style_sample_bank: Array.isArray(styleSampleBank) ? styleSampleBank : [],
        chapter_benchmark_sample_bank: Array.isArray(chapterBenchmarkSampleBank) ? chapterBenchmarkSampleBank : [],
      }
      const configRes = await apiClient.put(`/novel/projects/${projectId}/reference-config`, nextReferenceConfig)
      setSelectedProject((prev: any) => res.data?.project
        ? { ...res.data.project, reference_config: configRes.data || nextReferenceConfig }
        : (prev ? { ...prev, reference_config: configRes.data || nextReferenceConfig } : prev))
      setWritingBibleOpen(false)
      message.success('写作圣经已保存')
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.response?.data?.error || error?.message || '写作圣经保存失败')
    }
  }

  const openStoryStateEditor = async () => {
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/story-state`)
      const state = res.data?.story_state || {}
      storyStateForm.setFieldsValue({
        character_positions: JSON.stringify(state.character_positions || {}, null, 2),
        character_relationships: JSON.stringify(state.character_relationships || state.relationships || {}, null, 2),
        known_secrets: JSON.stringify(state.known_secrets || {}, null, 2),
        item_ownership: JSON.stringify(state.item_ownership || {}, null, 2),
        foreshadowing_status: JSON.stringify(state.foreshadowing_status || {}, null, 2),
        mainline_progress: state.mainline_progress || '',
        timeline: JSON.stringify(state.timeline || [], null, 2),
        story_state: JSON.stringify(state, null, 2),
      })
      setStoryStateOpen(true)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '故事状态加载失败')
    }
  }

  const saveStoryStateEditor = async () => {
    try {
      const v = await storyStateForm.validateFields()
      const parseJson = (value: string, fallback: any) => {
        try { return JSON.parse(value || '') } catch { return fallback }
      }
      const baseState = parseJson(v.story_state || '{}', {})
      const storyState = {
        ...baseState,
        character_positions: parseJson(v.character_positions, {}),
        character_relationships: parseJson(v.character_relationships, {}),
        known_secrets: parseJson(v.known_secrets, {}),
        item_ownership: parseJson(v.item_ownership, {}),
        foreshadowing_status: parseJson(v.foreshadowing_status, {}),
        mainline_progress: v.mainline_progress || baseState.mainline_progress || '',
        timeline: parseJson(v.timeline, []),
      }
      const res = await apiClient.put(`/novel/projects/${projectId}/story-state`, { story_state: storyState })
      setSelectedProject((prev: any) => res.data?.project || (prev ? { ...prev, reference_config: { ...(prev.reference_config || {}), story_state: res.data?.story_state || storyState } } : prev))
      setStoryStateOpen(false)
      await loadProjectModules()
      message.success('故事状态机已校正')
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message?.includes('JSON') ? '故事状态必须是合法 JSON' : (error?.response?.data?.error || error?.message || '故事状态保存失败'))
    }
  }

  const runBookReview = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setBookReviewLoading(true)
    try {
      await apiClient.post(`/novel/projects/${projectId}/book-review`, { model_id: selectedModelId })
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('bookReviews')
      message.success('全书总检已完成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '全书总检失败')
    } finally {
      setBookReviewLoading(false)
    }
  }


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


  const downloadBackupPackage = () => {
    const baseURL = String(apiClient.defaults.baseURL || '').replace(/\/$/, '')
    const link = document.createElement('a')
    link.href = `${baseURL}/novel/projects/${projectId}/backup-package`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const importBackupPackage = async () => {
    if (!backupImportText.trim()) return message.warning('请粘贴项目备份 JSON')
    setCommercialToolLoading('backupImport')
    try {
      const backup = JSON.parse(backupImportText)
      const res = await apiClient.post('/novel/backup-package/import', { package: backup })
      const project = res.data?.project
      message.success(`已导入项目：${project?.title || project?.id || ''}`)
      setBackupImportOpen(false)
      setBackupImportText('')
      if (project?.id) navigate(`/novel/workspace/${project.id}`)
    } catch (error: any) {
      message.error(error?.message?.includes('JSON') ? '备份内容必须是合法 JSON' : (error?.response?.data?.error || error?.message || '导入备份失败'))
    } finally {
      setCommercialToolLoading('')
    }
  }

  const runCreativeCommand = async (execute = false) => {
    if (!creativeCommandText.trim()) return message.warning('请输入创作指令')
    setCommercialToolLoading('creativeCommand')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/creative-command`, {
        command: creativeCommandText,
        execute,
      })
      setCreativeCommandPlan(res.data || null)
      await loadProductionTasks()
      if (execute) await loadProjectModules()
      message.success(execute ? '指令已执行可安全执行的部分' : '指令已解析')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '创作指令处理失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const openCreativeAssistant = () => {
    const selection = typeof window !== 'undefined' ? window.getSelection()?.toString() || '' : ''
    setCreativeAssistantSelectedText(selection.trim())
    setCreativeAssistantOpen(true)
  }

  const copyCreativeAssistantCard = async (card: CreativeAssistCard) => {
    const content = [
      card.title,
      card.intent ? `目的：${card.intent}` : '',
      card.reason ? `依据：${card.reason}` : '',
      card.suggestion ? `建议：${card.suggestion}` : '',
      card.risk ? `风险：${card.risk}` : '',
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard?.writeText(content)
      message.success('建议卡已复制')
    } catch {
      message.info(content)
    }
  }

  const runCreativeAssistant = async (input: { mode: CreativeAssistantModeKey; question: string; researchQuery: string }) => {
    setCreativeAssistantLoading(true)
    setCreativeAssistantError('')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/creative-assist`, {
        mode: input.mode,
        chapter_id: activeChapter?.id,
        selected_text: creativeAssistantSelectedText,
        question: input.question,
        research_query: input.researchQuery,
        model_id: selectedModelId,
        save: true,
      })
      setCreativeAssistantResult(normalizeCreativeAssistPayload(res.data?.assist || res.data))
      if (res.data?.review) await loadProjectModules()
      message.success('创作参谋建议已生成')
    } catch (error: any) {
      setCreativeAssistantError(error?.response?.data?.error || error?.message || '创作参谋调用失败')
    } finally {
      setCreativeAssistantLoading(false)
    }
  }

  const openRunQueue = async () => {
    await runCommercialTool('queue', '后台任务队列', async () => {
      const res = await apiClient.get(`/novel/projects/${projectId}/run-queue`)
      return res.data
    })
  }

  const openProductionDesk = async () => {
    navigate(`/novel/workspace/${projectId}/production`)
  }

  const startRunQueueWorker = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    await runCommercialTool('queueWorker', '后台任务队列', async () => {
      await apiClient.post(`/novel/projects/${projectId}/run-queue/start-worker`, {
        model_id: selectedModelId,
        max_chapters_per_run: 1,
      })
      const res = await apiClient.get(`/novel/projects/${projectId}/run-queue`)
      setTaskCenterOpen(true)
      return res.data
    })
  }

  const stopRunQueueWorker = async () => {
    await runCommercialTool('queueStop', '后台任务队列', async () => {
      await apiClient.post(`/novel/projects/${projectId}/run-queue/stop-worker`)
      const res = await apiClient.get(`/novel/projects/${projectId}/run-queue`)
      return res.data
    })
  }

  const recoverRunQueue = async () => {
    await runCommercialTool('queueRecover', '恢复后台任务队列', async () => {
      const res = await apiClient.post(`/novel/projects/${projectId}/run-queue/recover`)
      await loadProductionTasks()
      setTaskCenterOpen(true)
      return res.data
    })
  }

  const executeChapterGroupRun = async (run: any) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setChapterGroupExecutingId(run.id)
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/execute`, {
        model_id: selectedModelId,
        max_chapters: 50,
        production_mode: productionMode,
        ...chapterWordTargetPayload(),
      })
      await loadProjectModules()
      await loadProductionTasks()
      message.success('章节群执行完成或已暂停')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节群执行失败')
    } finally {
      setChapterGroupExecutingId(null)
    }
  }

  const approveChapterGroupStage = async (run: any, chapter: any) => {
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/approve`, {
        chapter_id: chapter.id,
        stage: chapter.approval_stage || run?.output_ref?.last_error?.approval_stage || 'scene_cards',
      })
      await loadProjectModules()
      await loadProductionTasks()
      message.success('已确认，任务可继续执行')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '确认失败')
    }
  }

  const retryChapterGroupStage = async (run: any, chapter: any) => {
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/retry-now`, { chapter_id: chapter.id })
      await loadProjectModules()
      await loadProductionTasks()
      message.success('已加入立即重试')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '重试失败')
    }
  }

  const skipChapterGroupStage = async (run: any, chapter: any) => {
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/skip-chapter`, {
        chapter_id: chapter.id,
        reason: '用户在任务中心跳过',
      })
      await loadProjectModules()
      await loadProductionTasks()
      message.success(`已跳过第${chapter.chapter_no}章，可继续执行后续章节`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '跳过失败')
    }
  }

  const executeReleaseRepairRun = async (run: any) => {
    setReleaseRepairExecutingId(run.id)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/release-repair-runs/${run.id}/execute`, {
        max_items: 100,
      })
      await loadProjectModules()
      await loadProductionTasks()
      const audit = res.data?.release_audit
      message.success(audit?.can_release ? '发布批量任务已完成，发布审核已通过' : '发布批量任务已完成，请刷新交付审核查看剩余问题')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '发布批量任务执行失败')
    } finally {
      setReleaseRepairExecutingId(null)
    }
  }

  const startChapterPipeline = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    setPipelineLoading(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/generation-pipeline/start`, {
        project_id: projectId,
        model_id: selectedModelId,
        ...chapterWordTargetPayload(),
        generate_scene_cards: true,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      setTaskCenterOpen(true)
      message.success('流水线已创建，已停在场景卡确认阶段')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '流水线启动失败')
    } finally {
      setPipelineLoading(false)
    }
  }

  const generateCurrentChapterProse = async (options: { allowIncomplete?: boolean; forceSceneCards?: boolean; targetChapterId?: number } = {}) => {
    const targetChapter = options.targetChapterId
      ? chapters.find(ch => String(ch.id) === String(options.targetChapterId))
      : activeChapter
    if (!targetChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    if (!await confirmReferenceReady('正文创作')) return
    const targetChapterNo = Number(targetChapter.chapter_no || 0)
    const currentChapterLaunchGate = (
      Number(autoCreationDirectorModel.targetChapter?.id || 0) === Number(targetChapter.id || 0)
      || Number(autoCreationDirectorModel.targetChapter?.chapterNo || 0) === targetChapterNo
    )
      ? autoCreationDirectorModel.chapterLaunchGate
      : null
    setStreamingChapterId(targetChapter.id)
    setStreamingText('')
    setStreamingProgress('正在请求模型...')
    setStreamingPercent(10)
    setGenerationPipeline([])
    setGeneratingProse(true)
    try {
      const ctx = {
        worldbuilding: worldbuilding[0] || null,
        characters, outlines,
        previousChapter: chapters.filter(ch => ch.chapter_no < targetChapterNo).sort((a, b) => b.chapter_no - a.chapter_no)[0] || null,
      }
      const resp = await fetch(
        `${apiClient.defaults.baseURL}/novel/chapters/${targetChapter.id}/generate-prose?stream=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            project_id: projectId, model_id: selectedModelId,
            ...chapterWordTargetPayload(),
            longform_compass: autoCreationDirectorModel.longformCompass,
            longform_battle_context: autoCreationDirectorModel.longformBattleDesk,
            chapter_launch_gate: currentChapterLaunchGate,
            million_word_runway: autoCreationDirectorModel.millionWordRunway,
            prompt: `请生成第 ${targetChapter.chapter_no} 章《${displayValue(targetChapter.title)}》完整正文`,
            payload: ctx,
            allow_incomplete: Boolean(options.allowIncomplete),
            force_scene_cards: Boolean(options.forceSceneCards),
          }),
        },
      )
      if (!resp.ok || !resp.body) {
        const raw = await resp.text()
        let payload: any = null
        try { payload = raw ? JSON.parse(raw) : null } catch { payload = null }
        if (payload?.error_code === 'PROSE_PREFLIGHT_BLOCKED' || payload?.error_code === 'REFERENCE_SAFETY_BLOCKED') {
          showGenerationBlockedModal(payload, () => { void generateCurrentChapterProse({ ...options, allowIncomplete: true }) }, {
            targetChapterId: targetChapter.id,
            onRepairComplete: () => { void generateCurrentChapterProse({ ...options, allowIncomplete: false, forceSceneCards: true, targetChapterId: targetChapter.id }) },
          })
        }
        throw new Error(payload?.error || raw || `HTTP ${resp.status}`)
      }
      const reader = resp.body.getReader()
      const dec = new TextDecoder('utf-8')
      let buf = '', done: any
      while (true) {
        const { value, done: d } = await reader.read()
        if (d) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop() || ''
        for (const part of parts) {
          const line = part.split('\n').find(r => r.startsWith('data: '))
          if (!line) continue
          const p = JSON.parse(line.replace(/^data: /, ''))
          if (p.pipeline) setGenerationPipeline(Array.isArray(p.pipeline) ? p.pipeline : [])
          if (p.type === 'progress') { setStreamingProgress(p.progress || '生成中...'); setStreamingPercent(Math.min(90, p.percent || 35)) }
          else if (p.type === 'chunk') { setStreamingText(prev => `${prev}${p.text || ''}`); setStreamingPercent(prev => Math.min(95, prev + 2)) }
          else if (p.type === 'done') done = p
          else if (p.type === 'error') {
            if (p.error_code === 'PROSE_PREFLIGHT_BLOCKED' || p.error_code === 'REFERENCE_SAFETY_BLOCKED') {
              showGenerationBlockedModal(p, () => { void generateCurrentChapterProse({ ...options, allowIncomplete: true }) }, {
                targetChapterId: targetChapter.id,
                onRepairComplete: () => { void generateCurrentChapterProse({ ...options, allowIncomplete: false, forceSceneCards: true, targetChapterId: targetChapter.id }) },
              })
            }
            throw new Error(p.error || '正文生成失败')
          }
        }
      }
      const updated = done?.chapter
      if (updated) setChapters(prev => prev.map(c => c.id === updated.id ? updated : c))
      setStreamingProgress('生成完成')
      setStreamingPercent(100)
      setStreamingText(prev => prev || updated?.chapter_text || '')
      await loadProjectModules()
      if (done?.diff) {
        const diff = done.diff
        Modal.info({
          title: '生成结果差异',
          width: 820,
          content: renderGenerationResultDiffContentView(diff, done.previous_version),
        })
      }
      setRightPanelOpen(true)
      setRightPanelTab('proseQuality')
      message.success(`已使用 ${done?.result?.modelName || '所选模型'} 生成正文`)
    } catch (error: any) {
      setStreamingProgress('生成失败'); setStreamingPercent(0)
      message.error(error?.message || '正文生成失败')
    } finally {
      setGeneratingProse(false)
      setTimeout(() => { setStreamingChapterId(null); setStreamingPercent(0) }, 1500)
    }
  }

  const repairContextAndGenerateCurrentChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    const targetChapterId = activeChapter.id
    setGeneratingProse(true)
    setStreamingChapterId(targetChapterId)
    setStreamingText('')
    setStreamingProgress('自动补齐上下文材料')
    setStreamingPercent(8)
    try {
      const res = await apiClient.post(`/novel/chapters/${targetChapterId}/auto-repair-context`, {
        project_id: projectId,
        model_id: selectedModelId,
      })
      const applied = Array.isArray(res.data?.applied) ? res.data.applied : []
      const warnings = Array.isArray(res.data?.warnings) ? res.data.warnings : []
      await loadProjectModules()
      if (warnings.length) {
        message.warning(String(warnings[0] || '上下文补齐已降级处理，将继续生成正文'))
      } else {
        message.success(applied.length ? `已自动补齐 ${applied.length} 项上下文材料` : '上下文材料无需补齐')
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '上下文自动补齐失败')
      setGeneratingProse(false)
      return
    }
    setGeneratingProse(false)
    await generateCurrentChapterProse({ allowIncomplete: true, forceSceneCards: true, targetChapterId })
  }

  /* ── 章节重组 ──────────────────────────────────────────────────── */
  const handleRestructure = async (mode: string, targetCount: number, instructions: string) => {
    if (selectedChapterIds.size < 2) {
      message.warning('至少选择 2 章才能进行重组')
      return
    }
    if (!await flushPendingSave()) return
    message.loading({ content: `${mode === 'expand' ? '正在扩展' : '正在合并'}章节...`, key: 'restructure', duration: 0 })

    const res = await apiClient.post('/novel/chapters/restructure', {
      project_id: projectId,
      model_id: selectedModelId,
      chapter_ids: Array.from(selectedChapterIds),
      mode,
      target_count: targetCount,
      instructions: instructions.trim(),
    })

    message.destroy('restructure')
    message.success(res.data?.message || '章节重组完成')

    // Reset selection and reload
    setSelectedChapterIds(new Set())
    setSelectMode(false)
    await loadProjectModules()
  }

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

  /* editor field helpers: shell/workspace-editor-fields */

  const openEditor = (kind: typeof editorKind, item?: any) => {
    const currentItem = item || (kind === 'worldbuilding' ? worldbuilding[0] : null)
    setEditorItem(currentItem || null)
    if (kind === 'worldbuilding') {
      const data = currentItem || {
        world_summary: '', rules: [], timeline_anchor: '', known_unknowns: [], version: 1,
      }
      editorForm.setFieldsValue({
        ...data,
        rules: formatListField(data.rules),
        timeline_anchor: formatListField(data.timeline_anchor),
        known_unknowns: formatListField(data.known_unknowns),
      })
    } else if (kind === 'character') {
      const data = currentItem || { name: '', role_type: '', archetype: '', motivation: '', goal: '', conflict: '' }
      const state = data.current_state || {}
      const profile = data.raw_payload?.profile || {}
      editorForm.setFieldsValue({
        ...data,
        role_type: data.role_type || data.role || '',
        age: state.age ?? profile.age ?? '',
        gender: profile.gender || state.gender || '',
        identity: profile.identity || state.identity || '',
        faction: profile.faction || state.faction || '',
        personality: formatListField(data.personality),
        abilities: formatListField(data.abilities),
        items: formatListField(state.items || state.inventory || data.raw_payload?.items),
        knowledge_scope: formatListField(state.knowledge_scope || state.known_facts),
        information_boundaries: formatListField(state.information_boundaries),
        relationships: formatJsonField(data.relationships || []),
        current_state: formatJsonField(state || {}),
      })
    } else if (kind === 'outline') {
      const data = currentItem || {
        outline_type: 'master', title: '', summary: '', conflict_points: [],
        turning_points: [], hook: '', parent_id: null,
      }
      editorForm.setFieldsValue({
        ...data,
        conflict_points: formatListField(data.conflict_points),
        turning_points: formatListField(data.turning_points),
      })
    } else if (kind === 'chapter') {
      const data = currentItem || {
        chapter_no: 1, title: '', chapter_goal: '', chapter_summary: '',
        conflict: '', ending_hook: '', outline_id: null, chapter_text: '',
      }
      editorForm.setFieldsValue({
        ...data,
        must_advance: formatListField(data.raw_payload?.must_advance),
        forbidden_repeats: formatListField(data.raw_payload?.forbidden_repeats),
        scene_breakdown: formatJsonField(data.scene_list || data.scene_breakdown || []),
      })
    }
    setEditorKind(kind)
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

  const submitEditor = async () => {
    if (!await flushPendingSave()) return
    const v = await editorForm.validateFields()
    try {
      if (editorKind === 'worldbuilding') {
        const payload = {
          project_id: projectId,
          world_summary: v.world_summary || '',
          rules: parseListField(v.rules),
          timeline_anchor: v.timeline_anchor || '',
          known_unknowns: parseListField(v.known_unknowns),
          version: Number(v.version || 1),
        }
        if (editorItem?.id) await apiClient.put(`/novel/worldbuilding/${editorItem.id}`, payload)
        else await apiClient.post(`/novel/projects/${projectId}/worldbuilding`, payload)
      } else if (editorKind === 'character') {
        const baseState = parseJsonField(v.current_state, {})
        const nextCurrentState = {
          ...(baseState && typeof baseState === 'object' && !Array.isArray(baseState) ? baseState : {}),
          age: v.age || baseState?.age || '',
          gender: v.gender || baseState?.gender || '',
          identity: v.identity || baseState?.identity || '',
          faction: v.faction || baseState?.faction || '',
          items: parseListField(v.items),
          knowledge_scope: parseListField(v.knowledge_scope),
          information_boundaries: parseListField(v.information_boundaries),
        }
        const payload = {
          project_id: projectId, name: v.name,
          role_type: v.role_type || '', archetype: v.archetype || '',
          motivation: v.motivation || '', goal: v.goal || '', conflict: v.conflict || '',
          personality: parseListField(v.personality),
          abilities: parseListField(v.abilities),
          appearance: v.appearance || '',
          backstory: v.backstory || '',
          secret: v.secret || '',
          growth_arc: v.growth_arc || '',
          arc_hint: v.arc_hint || '',
          relationships: parseJsonField(v.relationships, []),
          current_state: nextCurrentState,
          raw_payload: {
            ...(editorItem?.raw_payload || {}),
            profile: {
              ...((editorItem?.raw_payload || {}).profile || {}),
              age: v.age || '',
              gender: v.gender || '',
              identity: v.identity || '',
              faction: v.faction || '',
            },
            items: parseListField(v.items),
          },
        }
        if (editorItem?.id) await apiClient.put(`/novel/characters/${editorItem.id}`, payload)
        else await apiClient.post('/novel/characters', payload)
      } else if (editorKind === 'outline') {
        const payload = {
          project_id: projectId,
          outline_type: v.outline_type || 'master', title: v.title,
          summary: v.summary || '',
          conflict_points: parseListField(v.conflict_points),
          turning_points: parseListField(v.turning_points),
          hook: v.hook || '', parent_id: v.parent_id ?? null,
        }
        if (editorItem?.id) await apiClient.put(`/novel/outlines/${editorItem.id}`, payload)
        else await apiClient.post('/novel/outlines', payload)
      } else if (editorKind === 'chapter') {
        const payload = {
          project_id: projectId,
          chapter_no: Number(v.chapter_no || 1), title: v.title,
          chapter_goal: v.chapter_goal || '', chapter_summary: v.chapter_summary || '',
          conflict: v.conflict || '', ending_hook: v.ending_hook || '',
          status: editorItem?.status || 'draft', outline_id: v.outline_id ?? null,
          chapter_text: v.chapter_text || '',
          scene_breakdown: parseJsonField(v.scene_breakdown, []),
          scene_list: parseJsonField(v.scene_breakdown, []),
          raw_payload: {
            ...(editorItem?.raw_payload || {}),
            must_advance: parseListField(v.must_advance),
            forbidden_repeats: parseListField(v.forbidden_repeats),
          },
        }
        if (editorItem?.id) await apiClient.put(`/novel/chapters/${editorItem.id}`, payload)
        else await apiClient.post('/novel/chapters', { ...payload, scene_breakdown: [], continuity_notes: [] })
      }
      message.success('已保存')
      setEditorKind(null)
      setEditorItem(null)
      await loadProjectModules()
    } catch { message.error('保存失败') }
  }

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

  const handlePlanningAction = (key: PlanningActionKey, options?: { intent?: any }) => {
    const rollingPlanIntent = options?.intent || (key === 'update_rolling_plan' ? recentFatigueRollingPlanIntent : null)
    const actions: Record<PlanningActionKey, () => void | Promise<void>> = {
      update_rolling_plan: () => runRollingPlan({ intent: rollingPlanIntent || undefined }),
      complete_volume_plan: () => setOutlinePanelOpen(true),
      enter_story_planning: () => setWorkspaceArea('storyPlanning'),
      enter_chapter_writing: () => setWorkspaceArea('chapterWriting'),
      open_outline_tree: () => setOutlineTreeOpen(true),
      future100_audit: () => { void runFuture100SkeletonAudit() },
      future100_generate: () => { void generateFuture100Skeleton() },
      longform_pressure: () => { void runLongformPressureTest() },
      longform_creation_diagnosis: () => { void runLongformCreationDiagnosis() },
      topic_validation: () => { void runTopicValidation() },
      reference_diagnosis: () => { void openReferenceKnowledgeDiagnosis() },
      open_story_assets: () => openStoryAssetsWorkspace(),
      update_story_state: () => openStoryStateEditor(),
      open_quality_revision: () => setWorkspaceArea('qualityRevision'),
      run_first30_retention: () => { void runFirst30RetentionDiagnosis() },
      create_first30_repair: () => { void createFirst30RetentionRepairQueue() },
      run_reader_trial_review: () => { void runReaderTrialReview() },
      create_reader_trial_repair: () => { void createReaderTrialRepairQueue() },
      create_delivery_risk_repair: () => { void createDeliveryRiskRepairQueue(options?.intent?.payload) },
      record_storyline_diff_decision: () => { void recordStorylineDiffDecision(options?.intent) },
      create_storyline_decision_tasks: () => { void createStorylineDecisionTasks() },
      open_task_center: () => setTaskCenterOpen(true),
    }
    return runPlanningAction(actions, key)
  }

  const acceptCockpitChapterAndContinue = async () => {
    const currentNo = Number(writingCockpitModel.nextChapter?.chapterNo || 0)
    const next = sortedChapters.find(chapter => Number(chapter.chapter_no || 0) > currentNo && !chapterHasProse(chapter))
      || sortedChapters.find(chapter => Number(chapter.chapter_no || 0) > currentNo)
      || null

    if (!next?.id) {
      message.success('本章已达到交稿条件，当前项目暂无下一章。')
      return
    }

    setWorkspaceArea('chapterWriting')
    const saved = await selectChapterForWriting(Number(next.id))
    if (saved) message.success(`已进入第 ${next.chapter_no} 章。`)
  }

  const handleWritingCockpitAction = (key: WritingCockpitActionKey) => {
    const { targetChapterId, targetChapterUpdatedAt } = resolveWritingCockpitTarget({
      nextChapterId: writingCockpitModel.nextChapter?.id,
      activeChapter,
      sortedChapters,
    })

    switch (key) {
      case 'open_writing_bible':
        void openWritingBibleEditor()
        break
      case 'open_outline_panel':
        setOutlinePanelOpen(true)
        break
      case 'repair_materials':
        void openMaterialRepairPlan()
        break
      case 'refresh_context_package':
        void loadActiveChapterContextPackage({ chapterId: targetChapterId, updatedAt: targetChapterUpdatedAt })
        break
      case 'open_generation_diagnostics':
        void openGenerationDiagnostics()
        break
      case 'confirm_plan_and_write_draft':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void generateCurrentChapterProse({ targetChapterId })
          })
        } else {
          void generateCurrentChapterProse()
        }
        break
      case 'build_scene_plan':
        if (targetChapterId) {
          setWorkspaceArea('chapterWriting')
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void generateSceneCardsForChapter(targetChapterId)
          })
        } else if (activeChapter) {
          setWorkspaceArea('chapterWriting')
          void generateSceneCardsForActiveChapter()
        } else {
          setOutlinePanelOpen(true)
        }
        break
      case 'write_draft':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void generateCurrentChapterProse({ targetChapterId })
          })
        } else {
          void generateCurrentChapterProse()
        }
        break
      case 'review_draft':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId && Number(activeChapter?.id) !== targetChapterId) {
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void openChapterQualityCardForChapter(targetChapterId)
          })
        } else if (targetChapterId) {
          void openChapterQualityCardForChapter(targetChapterId)
        } else if (activeChapter) {
          void openChapterQualityCard()
        }
        break
      case 'fix_continuity':
        void openContinuityAudit()
        break
      case 'update_canon':
        openStoryStateEditor()
        break
      case 'open_task_center':
        setTaskCenterOpen(true)
        break
      case 'open_story_assets':
        openStoryAssetsWorkspace()
        break
      case 'refresh_current_quality':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void refreshProseQualityForChapter(targetChapterId, 'writing_cockpit')
        } else if (activeChapter) {
          void refreshActiveProseQuality('writing_cockpit')
        }
        break
      case 'create_editor_report':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void selectTargetChapterForWriting({
            targetChapterId,
            activeChapterId: activeChapter?.id,
            selectChapterForWriting,
          }).then((saved) => {
            if (saved) void createEditorReportForChapter(targetChapterId)
          })
        } else {
          void createEditorReport()
        }
        break
      case 'apply_editor_revision': {
        setWorkspaceArea('chapterWriting')
        const report = latestCockpitEditorReport()
        if (!report) {
          message.warning('还没有可用于修订的编辑报告。')
          setRightPanelOpen(true)
          setRightPanelTab('editorReports')
          break
        }
        void selectTargetChapterForWriting({
          targetChapterId,
          activeChapterId: activeChapter?.id,
          selectChapterForWriting,
        }).then((saved) => {
          if (saved) void applyEditorRevision(report, { skipConfirm: true, targetChapterId, autoStoryState: false })
        })
        break
      }
      case 'sync_story_state':
        void syncStoryStateForChapter(targetChapterId)
        break
      case 'accept_chapter_and_continue':
        void acceptCockpitChapterAndContinue()
        break
      case 'open_editor_reports':
        setRightPanelOpen(true)
        setRightPanelTab('editorReports')
        break
      case 'open_version_history':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId && Number(activeChapter?.id) !== targetChapterId) {
          void selectTargetChapterForWriting({
            targetChapterId,
            activeChapterId: activeChapter?.id,
            selectChapterForWriting,
          }).then((saved) => {
            if (!saved) return
            setRightPanelOpen(true)
            setRightPanelTab('versions')
          })
          break
        }
        setRightPanelOpen(true)
        setRightPanelTab('versions')
        break
    }
  }

  const runAutoCreationRepairAction = async (repairAction: AutoCreationDirectorAction) => {
    if (!repairAction || repairAction.disabled || repairAction.key === 'auto_repair_blockers') return false
    switch (repairAction.key) {
      case 'longform_creation_diagnosis':
        await runLongformCreationDiagnosis()
        return true
      case 'run_first30_retention':
        await runFirst30RetentionDiagnosis()
        return true
      case 'create_first30_repair':
        await createFirst30RetentionRepairQueue()
        return true
      case 'run_reader_trial_review':
        await runReaderTrialReview()
        return true
      case 'create_reader_trial_repair':
        await createReaderTrialRepairQueue()
        return true
      case 'longform_pressure':
        await runLongformPressureTest()
        return true
      case 'sync_story_state':
        await syncStoryStateForChapter()
        return true
      case 'create_delivery_risk_repair':
        await createDeliveryRiskRepairQueue(repairAction.payload)
        return true
      case 'create_safe_batch_risk_repair':
        await createSafeBatchRiskRepairQueue()
        return true
      case 'create_style_sample_batch_repair':
        await createStyleSampleBatchRepairQueue()
        return true
      case 'create_recovery_evidence_governance_queue':
        await createRecoveryEvidenceGovernanceQueue(repairAction.payload)
        return true
      case 'create_script_room_repair':
        await createScriptRoomRepairQueue()
        return true
      case 'open_generation_diagnostics':
        await openGenerationDiagnostics()
        return true
      case 'open_story_assets':
        openStoryAssetsWorkspace()
        return true
      case 'open_task_center':
        setTaskCenterRecoveryFocus(safeBatchRecoveryFocusFromPayload(repairAction.payload))
        setTaskCenterOpen(true)
        return true
      case 'select_model':
        message.info('请先在顶部选择一个可用模型。')
        return true
      case 'complete_volume_plan':
        setOutlinePanelOpen(true)
        return true
      case 'open_outline_tree':
        setOutlineTreeOpen(true)
        return true
      case 'enter_story_planning':
        setWorkspaceArea('storyPlanning')
        return true
      case 'enter_chapter_writing':
        setWorkspaceArea('chapterWriting')
        return true
      case 'open_writing_bible':
        await openWritingBibleEditor()
        return true
      case 'repair_materials':
        await openMaterialRepairPlan()
        return true
      case 'refresh_context_package':
        await loadActiveChapterContextPackage()
        return true
      case 'refresh_current_quality':
        if (activeChapter) await refreshActiveProseQuality('auto_creation_repair')
        return true
      case 'create_editor_report':
        await createEditorReport()
        return true
      case 'apply_editor_revision':
        handleWritingCockpitAction('apply_editor_revision')
        return true
      case 'update_rolling_plan':
        await Promise.resolve(handlePlanningAction('update_rolling_plan', { intent: repairAction.payload }))
        return true
      case 'record_storyline_diff_decision':
        await recordStorylineDiffDecision(repairAction.payload)
        return true
      case 'create_storyline_decision_tasks':
        await createStorylineDecisionTasks()
        return true
      default:
        if (repairAction.area === 'planning' || repairAction.area === 'assets') {
          await Promise.resolve(handlePlanningAction(repairAction.key as PlanningActionKey, { intent: repairAction.payload }))
          return true
        }
        if (repairAction.area === 'writing' || repairAction.area === 'quality') {
          await Promise.resolve(handleWritingCockpitAction(repairAction.key as WritingCockpitActionKey))
          return true
        }
        return false
    }
  }

  const runAutoCreationRepairPlan = async (action: AutoCreationDirectorAction) => {
    const payloadActions = Array.isArray(action.payload?.actions) ? action.payload.actions : []
    const repairActions = payloadActions.length ? payloadActions : autoCreationDirectorModel.repairPlan.actions
    const executableActions = repairActions.filter((item: AutoCreationDirectorAction) => item && !item.disabled && item.key !== 'auto_repair_blockers')
    if (!executableActions.length) {
      message.info('当前没有可自动修复的阻塞。')
      return
    }
    setAutoDirectorActionLoadingKey('auto_repair_blockers')
    let completed = 0
    try {
      for (const repairAction of executableActions) {
        const handled = await runAutoCreationRepairAction(repairAction)
        if (handled) completed += 1
        setAutoDirectorActionLoadingKey('auto_repair_blockers')
      }
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      message.success(`已处理自动修复阻塞：${completed}/${executableActions.length} 项`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '自动修复阻塞失败')
    } finally {
      setAutoDirectorActionLoadingKey('')
    }
  }

  const handleAutoCreationDirectorAction = (action: AutoCreationDirectorAction) => {
    if (action.disabled) return
    if (action.key === 'auto_repair_blockers') {
      void runAutoCreationRepairPlan(action)
      return
    }
    if (action.modelCall) setAutoDirectorActionLoadingKey(String(action.key))

    if (isAutoCreationPlanningArea(action)) {
      if (action.key === 'open_story_assets') {
        openStoryAssetsWorkspace()
        setAutoDirectorActionLoadingKey('')
        return
      }
      if (action.key === 'update_rolling_plan' && (action.payload?.source === 'batch_brief_repair' || action.payload?.source === 'recent_fatigue_repair')) {
        void Promise.resolve(handlePlanningAction(action.key as PlanningActionKey, { intent: action.payload }))
          .finally(() => setAutoDirectorActionLoadingKey(''))
        return
      }
      void Promise.resolve(handlePlanningAction(action.key as PlanningActionKey))
        .finally(() => setAutoDirectorActionLoadingKey(''))
      return
    }

    if (isAutoCreationWritingArea(action)) {
      void Promise.resolve(handleWritingCockpitAction(action.key as WritingCockpitActionKey))
        .finally(() => setAutoDirectorActionLoadingKey(''))
      return
    }

    if (action.key === 'review_governance_closure') {
      setTaskCenterOpen(true)
      const repairRunId = Number(action.payload?.repairAuditRunId || 0)
      const repairRun = repairRunId ? runRecords.find(run => Number(run.id) === repairRunId) : null
      if (repairRun) {
        void Promise.resolve(generateLongformRepairAuditSummary(repairRun))
          .finally(() => setAutoDirectorActionLoadingKey(''))
      } else {
        message.info('已打开任务中心，请逐项处理治理闭环任务。')
        setAutoDirectorActionLoadingKey('')
      }
      return
    }

    if (action.key === 'open_task_center') {
      setTaskCenterRecoveryFocus(safeBatchRecoveryFocusFromPayload(action.payload))
      setTaskCenterOpen(true)
      setAutoDirectorActionLoadingKey('')
      return
    }

    if (action.key === 'start_safe_batch_generation') {
      const guardrail = autoCreationDirectorModel.batchGuardrail
      if (guardrail.status !== 'ready' || guardrail.safeChapterCount <= 0) {
        message.warning('连续生产护栏尚未通过，先处理阻塞或谨慎项。')
        setAutoDirectorActionLoadingKey('')
        return
      }
      void stepGenerateProse({
        limit: autoCreationDirectorModel.batchGuardrail.safeChapterCount,
        allowedChapterNos: autoCreationDirectorModel.batchGuardrail.nextBatchBrief.chapters.map(chapter => chapter.chapterNo),
        source: 'auto_creation_safe_batch',
        longformCompass: autoCreationDirectorModel.longformCompass,
        longformBattleContext: autoCreationDirectorModel.longformBattleDesk,
        chapterLaunchGate: autoCreationDirectorModel.chapterLaunchGate,
        nextBatchBrief: autoCreationDirectorModel.batchGuardrail.nextBatchBrief,
        batchPreflight: autoCreationDirectorModel.batchGuardrail.preflight.inputSnapshot,
        millionWordRunway: autoCreationDirectorModel.millionWordRunway,
      })
        .finally(() => setAutoDirectorActionLoadingKey(''))
      return
    }

    if (action.key === 'create_safe_batch_risk_repair') {
      void createSafeBatchRiskRepairQueue()
      return
    }

    if (action.key === 'create_style_sample_batch_repair') {
      void createStyleSampleBatchRepairQueue()
      return
    }

    if (action.key === 'create_recovery_evidence_governance_queue') {
      void createRecoveryEvidenceGovernanceQueue(action.payload)
      return
    }

    if (action.key === 'create_script_room_repair') {
      void createScriptRoomRepairQueue()
      return
    }

    if (action.key === 'create_delivery_risk_repair') {
      void createDeliveryRiskRepairQueue(action.payload)
      return
    }

    if (action.key === 'select_model') {
      message.info('请先在顶部选择一个可用模型。')
      setAutoDirectorActionLoadingKey('')
    }
  }

  const handleSerialPipelineAction = (key: string) => {
    switch (key) {
      case 'open_writing_bible':
        openStoryAssetsWorkspace()
        void openWritingBibleEditor()
        break
      case 'enter_story_planning':
        setWorkspaceArea('storyPlanning')
        break
      case 'confirm_plan_and_write_draft':
        handleWritingCockpitAction('confirm_plan_and_write_draft')
        break
      case 'refresh_current_quality':
        handleWritingCockpitAction('refresh_current_quality')
        break
      case 'create_editor_report':
        handleWritingCockpitAction('create_editor_report')
        break
      case 'apply_editor_revision':
        handleWritingCockpitAction('apply_editor_revision')
        break
      case 'sync_story_state':
        handleWritingCockpitAction('sync_story_state')
        break
      case 'start_safe_batch':
        setWorkspaceArea('autoCreation')
        handleAutoCreationDirectorAction({ key: 'start_safe_batch_generation' } as AutoCreationDirectorAction)
        break
      case 'open_longform_governance':
        setWorkspaceArea('productionOps')
        void openLongformProductionTrends()
        break
      default: {
        const area = serialPipelineActionWorkspaceArea(key, serialPipelineModel.primaryAction.workspace_area)
        if (area) setWorkspaceArea(area)
      }
    }
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
