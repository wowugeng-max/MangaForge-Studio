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
  renderLongformRepairAuditContentView,
  renderGenerationResultDiffContentView,
} from './novel-workspace/shell/workspace-commercial-result'
import { NovelWorkspaceTopBar } from './novel-workspace/shell/workspace-topbar'
import { NovelWorkspaceDeferredSurfaces } from './novel-workspace/shell/workspace-deferred-surfaces'
import { NovelWorkspaceBody } from './novel-workspace/shell/workspace-body'
import { createCommercialToolHandlers } from './novel-workspace/shell/workspace-commercial-tools'
import { createPreflightHandlers } from './novel-workspace/shell/workspace-preflight-handlers'
import { createRepairTaskHandlers } from './novel-workspace/shell/workspace-repair-task-handlers'
import { createWorkspaceActionHandlers } from './novel-workspace/shell/workspace-action-handlers'
import { createChapterProseHandlers } from './novel-workspace/shell/workspace-chapter-prose-handlers'
import { createWritingBibleHandlers } from './novel-workspace/shell/workspace-writing-bible-handlers'
import { createPlanningHandlers } from './novel-workspace/shell/workspace-planning-handlers'
import { createProductionHandlers } from './novel-workspace/shell/workspace-production-handlers'
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
